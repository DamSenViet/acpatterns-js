const title = "acpatterns-js";

const head = [
  ["link", { rel: "icon", href: "/favicon.png" }],
];

const logo = "/hero.svg";

const nav = [
  { text: "Guide", link: "/guide/", },
  { text: "Examples", link: "/examples/" },
  { text: "Documentation", link: "/documentation/", },
  { text: "Playground", link: "/playground/", },
  { text: "GitHub", link: "https://github.com/DamSenViet/acpatterns-js", target: "_blank", },
];

const displayAllHeaders = false;

const sidebar = "auto";
const sidebarDepth = 3;

const search = true;
const searchPlaceholder = "Search...";
const searchMaxSuggestions = 10;

const lastUpdated = true;

const editLinks = true;
const editLinkText = 'Edit this page!';

const smoothScrolling = true;

const themeConfig = {
  logo,
  nav,
  
  displayAllHeaders,
  sidebar,
  sidebarDepth,
  collapsable: true,
  
  search,
  searchPlaceholder,
  searchMaxSuggestions,
  
  lastUpdated,
  
  editLinks,
  editLinkText,
  
  smoothScrolling,
};


const plugins = [
  'vuepress-plugin-typescript',
];

module.exports = {
  title,
  head,
  themeConfig,
  plugins,
};