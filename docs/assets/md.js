/** Minimal Markdown → HTML for hub landing docs (headings, lists, tables, links, bold). */
(function () {
  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inline(s) {
    let out = escapeHtml(s);
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    return out;
  }

  function render(md) {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let i = 0;
    let listType = null;

    function closeList() {
      if (listType) {
        html.push(listType === "ul" ? "</ul>" : "</ol>");
        listType = null;
      }
    }

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim() === "") {
        closeList();
        i += 1;
        continue;
      }

      if (line.trim() === "---") {
        closeList();
        html.push("<hr>");
        i += 1;
        continue;
      }

      if (line.startsWith("# ")) {
        closeList();
        html.push("<h1>" + inline(line.slice(2)) + "</h1>");
        i += 1;
        continue;
      }
      if (line.startsWith("## ")) {
        closeList();
        html.push("<h2>" + inline(line.slice(3)) + "</h2>");
        i += 1;
        continue;
      }
      if (line.startsWith("### ")) {
        closeList();
        html.push("<h3>" + inline(line.slice(4)) + "</h3>");
        i += 1;
        continue;
      }

      if (line.startsWith("> ")) {
        closeList();
        const parts = [];
        while (i < lines.length && lines[i].startsWith("> ")) {
          parts.push(inline(lines[i].slice(2)));
          i += 1;
        }
        html.push("<blockquote><p>" + parts.join("<br>") + "</p></blockquote>");
        continue;
      }

      if (/^\|.+\|$/.test(line.trim()) && i + 1 < lines.length && /^\|[\s:-|]+\|$/.test(lines[i + 1].trim())) {
        closeList();
        const rows = [];
        while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
          const cells = lines[i]
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          rows.push(cells);
          i += 1;
          if (i < lines.length && /^\|[\s:-|]+\|$/.test(lines[i].trim())) {
            i += 1; // skip separator
          }
        }
        html.push("<table><thead><tr>");
        rows[0].forEach((c) => html.push("<th>" + inline(c) + "</th>"));
        html.push("</tr></thead><tbody>");
        rows.slice(1).forEach((row) => {
          html.push("<tr>");
          row.forEach((c) => html.push("<td>" + inline(c) + "</td>"));
          html.push("</tr>");
        });
        html.push("</tbody></table>");
        continue;
      }

      const ul = line.match(/^[-*] (.+)$/);
      if (ul) {
        if (listType !== "ul") {
          closeList();
          html.push("<ul>");
          listType = "ul";
        }
        html.push("<li>" + inline(ul[1]) + "</li>");
        i += 1;
        continue;
      }

      const ol = line.match(/^\d+\. (.+)$/);
      if (ol) {
        if (listType !== "ol") {
          closeList();
          html.push("<ol>");
          listType = "ol";
        }
        html.push("<li>" + inline(ol[1]) + "</li>");
        i += 1;
        continue;
      }

      closeList();
      html.push("<p>" + inline(line) + "</p>");
      i += 1;
    }
    closeList();
    return html.join("\n");
  }

  async function mount(el, src) {
    el.innerHTML = "<p>Loading…</p>";
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(String(res.status));
      const md = await res.text();
      el.innerHTML = render(md);
    } catch (err) {
      el.innerHTML =
        '<p>Could not load <code>' +
        escapeHtml(src) +
        '</code>. Open the <a href="' +
        escapeHtml(src) +
        '">Markdown source</a> directly.</p>';
      console.error(err);
    }
  }

  globalThis.HubMD = { render: render, mount: mount };
})();
