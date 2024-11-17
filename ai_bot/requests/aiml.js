const { OpenAI } = require("openai");


/***************************************************************************************
* Title: Function to call AI models API
* Author: AI/ML API documentation
* Date: Last updated 2 months ago
* Code version: v1
* Availability: https://docs.aimlapi.com/quickstart/setting-up
*
***************************************************************************************/
async function fetchAI (request) {
    const apiKey = process.env.API_KEY;
    const baseURL = process.env.API_URL;

    const api = new OpenAI({
        apiKey,
        baseURL,
    });
    const completion = await api.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an helpful assistant",
          },
          {
            role: "user",
            content: request,
          },
        ],
        temperature: 0.7,
        max_tokens: 256,
      });
    
      const response = completion.choices[0].message.content;
      return response;
}

module.exports = fetchAI;
