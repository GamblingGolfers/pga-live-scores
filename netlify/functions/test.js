// File: netlify/functions/test.js

exports.handler = async () => {
  console.log("--- Test function was executed successfully! ---");

  return {
    statusCode: 200,
    body: "Hello from the test function!"
  };
};
