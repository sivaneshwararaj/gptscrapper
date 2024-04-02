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

function processCell() {
    const cellAddress = 'A' + currentCellRow;
    const cellValue = worksheet[cellAddress].v; 
    console.log("processing "+cellValue);
    
    currentCellRow++; // Move to the next cell down

    // Check if there's a next cell in the column
    if (worksheet['A' + currentCellRow]) {
        setTimeout(processCell, 2000);
        let htmltext=getRenderedHTML(cellValue)
        const options = {
            wordwrap: 130,
            // ...
          };
          htmltext.then(html => {
            const outputData = {
                url: url,
                rendered_html: convert(html, options) 
            };
        
        
            fs.writeFile('data.txt', outputData.rendered_html, (err) => {
                if (err) {
                    console.error("Error saving data to txt:", err);
                } 
                else {
                    console.log("Extracted data proceed to process with openai ");
                    
                    let jsondata=get_json();
                    jsondata.then(newdata =>{
                    const filePath = 'data.json';
                    fs.readFile(filePath, 'utf8', (err, data) => {
                        if (err) {
                            console.error('Error reading file:', err);
                            return;
                        }
                        let jsonData = [];
                        try {
                            // Parse existing JSON data
                            jsonData = JSON.parse(data);
                        } catch (parseError) {
                            console.error('Error parsing JSON:', parseError);
                            return;
                        }
                    
                        // Append new data to the array
                        jsonData.push(newdata);
                    
                        // Convert the updated data back to JSON format
                        const updatedJsonData = JSON.stringify(jsonData, null, 2);
                    
                        // Write the updated JSON data back to the file
                        fs.writeFile(filePath, updatedJsonData, 'utf8', (writeErr) => {
                            if (writeErr) {
                                console.error('Error writing file:', writeErr);
                                return;
                            }
                            console.log('Data successfully added to data.json');
                        });
                    });

                        }).catch(Error=>{})

                }
            
        }).catch(error => {
            console.error("Error extracting HTML:", error); 
        });
    }).catch(err=>{
        console.log("erro")
    })


        
        
    } else {
        console.log('End of column reached.');
    }
}

// Start the process
processCell();
