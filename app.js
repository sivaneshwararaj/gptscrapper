const xlsx = require('xlsx');
require('dotenv').config(); 
const puppeteer = require('puppeteer');
const fs = require('fs');
const { convert } = require('html-to-text');
const OpenAI =require("openai");

const openai = new OpenAI();

//function to get rendered html using puppter
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
//function to get json from openai
async function get_json() {
    //loading data from data.txt and store it in variable for processing
    const filePath = 'data.txt';

    // Read data from file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading file:', err);
        return;
      }
    
      // Replace newline characters with spaces
      const modifiedData = data.replace(/\n/g, ' ');
    
      // Store modified data in a variable
      const newData = modifiedData.trim(); // Optional: Trim leading and trailing spaces
    
      return newData
      
    });

    const messages = [{ role: 'user', content: 'Extract every event day and location in json format in the following text '+newData }]
  
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 1,
      presence_penalty: 1,
    })
  
    const completion = response.choices[0].message.content
    return completion;
  }  



const workbook = xlsx.readFile('input.xlsx');
const sheetName = workbook.SheetNames[0]; // Get the first sheet's name
const worksheet = workbook.Sheets[sheetName];

let currentCellRow = 1; // Start at row 1 (A1)

async function processCell() {
  const cellAddress = 'A' + currentCellRow;
  if (!worksheet[cellAddress]) {
      console.log('End of column reached.');
      return;
  }
  const cellValue = worksheet[cellAddress].v;
  console.log("processing " + cellValue);

  try {
      const htmltext = await getRenderedHTML(cellValue);
      const options = { wordwrap: 130 };
      const outputData = {
          url: cellValue,
          rendered_html: convert(htmltext, options)
      };

      await fs.promises.writeFile('data.txt', outputData.rendered_html);
      console.log("Extracted data proceed to process with openai");

      const jsondata = await get_json(); // Ensure get_json is refactored to work correctly
      // Further processing...
  } catch (error) {
      console.error("Error during processing:", error);
  } finally {
      currentCellRow++; // Move to the next cell down
      setTimeout(processCell, 2000); // Schedule next process
  }
}

// Start the process
processCell();
