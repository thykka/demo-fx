"use strict";
import config from './config.json';
import articles from './articles/index.json';
import marked from 'marked';

// document.body.innerHTML = marked.parse(hw);

console.log(articles);

const loadArticle = async (article) => {
  const articlePath = './articles/01-hello-world.md'; //config.articlesPath + article.file;
  console.log(articlePath);
  let articleContent = await import(articlePath);
  console.log(articleContent);
};

loadArticle(articles[0]);
