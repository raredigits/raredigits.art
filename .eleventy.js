const { IdAttributePlugin } = require("@11ty/eleventy");

module.exports = function(eleventyConfig) {
  // Stable ids on every heading, so section links and the docs table of
  // contents have targets (CSS-362). Headings that already carry an id keep it.
  eleventyConfig.addPlugin(IdAttributePlugin);

  eleventyConfig.addCollection("kb", collection =>
    collection.getFilteredByGlob("_posts/*.{md,html}")
  );

  eleventyConfig.addGlobalData("year", () => (new Date()).getFullYear());

  eleventyConfig.addNunjucksFilter("dateDMY", function(dateObj) {
    if (!(dateObj instanceof Date)) return '';
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });

  eleventyConfig.addNunjucksFilter("dateLong", function(dateObj) {
    if (!(dateObj instanceof Date)) return '';
    const month = dateObj.toLocaleString('en-US', { month: 'long' });
    const day = String(dateObj.getDate()).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${month} ${day}, ${year}`;
  });

  eleventyConfig.addGlobalData("buildDate", () => new Date());

  eleventyConfig.addPassthroughCopy("assets/img");
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("assets/css/rare.css");
  eleventyConfig.addPassthroughCopy("assets/css/rare.min.css"); // /styles/ Download button (CSS-363)
  eleventyConfig.addPassthroughCopy("assets/css/fonts");
  eleventyConfig.addPassthroughCopy("assets/css/images");
  eleventyConfig.addPassthroughCopy("assets/css/examples/rare-styles-main.css");
  eleventyConfig.addPassthroughCopy("assets/css/rare-website.css");
  eleventyConfig.addPassthroughCopy("assets/charts");

  // Worked-example assets (v0.6.20 auto-shop harvest). Each example owns its
  // skin + media under its own assets/ folder; the folder is passed through
  // verbatim so /examples/styles/<name>/assets/... resolves at that path.
  eleventyConfig.addPassthroughCopy("examples/styles/hetke/landing/assets");

  // The content starter demo (v0.7.1, CSS-349) is plain HTML meant to be
  // copied into an unrelated site, so it is published byte for byte: ignored
  // as templates (.eleventyignore), copied as files, and in `--serve` served
  // straight from source so edits show without a restart. Its download,
  // content-starter.zip, is made by `npm run zip:starter` after the build.
  eleventyConfig.addPassthroughCopy("examples/styles/content-starter/demo");
  eleventyConfig.setServerPassthroughCopyBehavior("passthrough");

  eleventyConfig.addWatchTarget("./assets/css/rare.css");
  eleventyConfig.addWatchTarget("./assets/css/examples/rare-styles-main.css");
  eleventyConfig.addWatchTarget("./assets/css/");

  eleventyConfig.addWatchTarget("./assets/charts/rare-charts.js");

  eleventyConfig.setChokidarConfig({
    usePolling: true,
    interval: 500
  });

  eleventyConfig.setBrowserSyncConfig({
    files: [
      './_site/assets/css/**/*.css'
    ]
  });
  
  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    }
  };
};