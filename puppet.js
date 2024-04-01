const puppeteer = require('puppeteer');
const fs = require('fs');
const { convert } = require('html-to-text');


async function getRenderedHTML(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try { 
    await page.goto(url, { waitUntil: 'networkidle0' }); // Wait for network idle

    // Ensure dynamic content is loaded (adjust if needed)
    await page.waitForSelector('body'); // Example - wait for <body> to exist

    const renderedHTML = await page.evaluate(() => document.documentElement.outerHTML);
    return renderedHTML; 

  } catch (error) {
    console.error(`Error processing URL ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

const url = "https://www.fibe-berlin.com/"; 
let htmlPromise = getRenderedHTML(url);
const options = {
    wordwrap: 130,
    // ...
  };
htmlPromise.then(html => {
    const outputData = {
        url: url,
        rendered_html: convert(html, options) 
    };


    fs.writeFile('data.txt', outputData.rendered_html, (err) => {
        if (err) {
            console.error("Error saving data to txt:", err);
        } else {
            console.log("Extracted data proceed to process with openai ");
        }
    });
}).catch(error => {
    console.error("Error extracting HTML:", error); 
});
