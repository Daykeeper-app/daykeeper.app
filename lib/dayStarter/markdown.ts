/**
 * Markdown-subset → tiptap HTML converter for day-starter content.
 * Ported from daykeeper-app/utils/richtext.ts (markdownToHtml) so both
 * platforms consume the same markdown-based content file
 * (lib/dayStarter/content.ts). Supported: **bold**, *italic*, "- " bullets.
 */

function encodeEntities(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function markdownToHtml(md: string): string {
  const inline = (line: string) =>
    encodeEntities(line)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")

  const lines = md.split("\n")
  const html: string[] = []
  let listOpen = false

  for (const raw of lines) {
    if (/^\s*-\s/.test(raw)) {
      if (!listOpen) {
        html.push("<ul>")
        listOpen = true
      }
      html.push(`<li><p>${inline(raw.replace(/^\s*-\s/, ""))}</p></li>`)
    } else {
      if (listOpen) {
        html.push("</ul>")
        listOpen = false
      }
      html.push(`<p>${inline(raw) || "<br>"}</p>`)
    }
  }
  if (listOpen) html.push("</ul>")
  return html.join("")
}
