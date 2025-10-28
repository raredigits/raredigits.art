module.exports = function(eleventyConfig) {
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

  eleventyConfig.addPassthroughCopy("assets/img");
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("assets/css/rare.css");
  eleventyConfig.addPassthroughCopy("assets/css/examples/rare-styles-main.css");
  eleventyConfig.addPassthroughCopy("assets/css/rare-website.css");

  eleventyConfig.addWatchTarget("./assets/css/rare.css");
  eleventyConfig.addWatchTarget("./assets/css/examples/rare-styles-main.css");
  eleventyConfig.addWatchTarget("./assets/css/");

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