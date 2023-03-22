export function shortenURL(url) {
  if (url == null) {
    return url;
  }
  let shortURL = "";

  url = url.replace("http://", "");
  shortURL = shortURL.concat(
    url.slice(0, 3),
    "...",
    url.slice(url.length - 8, url.length)
  );

  return shortURL;
}
