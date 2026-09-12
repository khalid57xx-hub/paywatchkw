// Minimal stand-in for the `tr46` package used by whatwg-url (pulled in by the
// MongoDB connection-string parser). The real package requires "punycode/",
// which the worker bundler cannot resolve. Atlas hostnames are ASCII, so a
// pass-through implementation is sufficient.
function toASCII(domainName) {
  return typeof domainName === "string" ? domainName.toLowerCase() : domainName;
}

function toUnicode(domainName) {
  return { domain: domainName, error: false };
}

module.exports = { toASCII, toUnicode };
