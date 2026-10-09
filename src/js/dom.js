// Tiny DOM helpers used instead of a UI framework.
//
// h(tag, props, ...children) creates an element:
//   className            -> element.className
//   style                -> object of CSS properties (camelCase or "--custom" names) or a CSS string
//   onXxx (function)     -> addEventListener("xxx", fn)   e.g. onPointerDown -> "pointerdown", onClick -> "click"
//   other keys           -> setAttribute(key, value); `false`/null/undefined skip the attribute, `true` sets it empty
//   width / height / src / alt / type / draggable are also plain attributes
// children may be strings, numbers, Nodes, arrays of those, or false/null/undefined (ignored).
const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set(["svg", "rect", "circle", "path", "g", "line", "ellipse", "polygon", "polyline", "text"]);

function applyStyle(el, style) {
  if (style == null) return;
  if (typeof style === "string") {
    el.style.cssText = style;
    return;
  }
  for (const [name, value] of Object.entries(style)) {
    if (value == null) continue;
    if (name.startsWith("--")) el.style.setProperty(name, String(value));
    else el.style[name] = value;
  }
}

function appendChildren(parent, children) {
  for (const child of children) {
    if (child == null || child === false || child === true) continue;
    if (Array.isArray(child)) appendChildren(parent, child);
    else parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function h(tag, props, ...children) {
  const el = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === "className") el.setAttribute("class", value);
    else if (key === "style") applyStyle(el, value);
    else if (/^on[A-Z]/.test(key) && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  appendChildren(el, children);
  return el;
}

// Replaces all children of `parent` with `children` (same rules as h()).
export function setChildren(parent, ...children) {
  parent.replaceChildren();
  appendChildren(parent, children);
}

// Shows/hides an element without removing it from the DOM.
export function setVisible(el, visible) {
  el.style.display = visible ? "" : "none";
}

// Removes an element from the page.
export function removeEl(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}
