ccm.callback[ 'templates.js' ]( {
  
  "main": {
    "tag": "div",
    "class": "messages"
  },

  "message": {
    "tag": "div",
    "class": "message",
    "inner": [
      {
        "tag": "div",
        "class": "name",
        "inner": "%name%"
      },
      {
        "tag": "div",
        "class": "text",
        "inner": "%text%"
      }
    ]
  },

  "input": {
    "tag": "div",
    "class": "new_message",
    "inner": [
      {
        "tag": "div",
        "class": "name"
      },
      {
        "tag": "div",
        "class": "text",
        "inner": {
          "tag": "form",
          "inner": [
            {
              "tag": "input",
              "class": "input",
              "placeholder": "Enter message here..."
            },
            {
              "tag": "input",
              "class": "button",
              "type": "submit",
              "value": "Send"
            }
          ],
          "onsubmit": "%onsubmit%"
        }
      }
    ]
  }
  
} );