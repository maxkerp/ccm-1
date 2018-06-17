/**
 * @overview configurations of ccm component for rendering a quiz
 * @author André Kless <andre.kless@web.de> 2018
 * @license The MIT License (MIT)
 */

ccm.files[ 'configs.js' ] = {
  "demo": {
    "css": [ "ccm.load", "https://ccmjs.github.io/akless-components/quiz/resources/weblysleek.css", { "context": "head", "url": "https://ccmjs.github.io/akless-components/libs/weblysleekui/font.css" } ],
    // "user": [ "ccm.instance", "https://ccmjs.github.io/akless-components/user/versions/ccm.user-1.0.0.min.js" ],
    // "logger": [ "ccm.instance", "https://ccmjs.github.io/akless-components/log/versions/ccm.log-1.0.0.min.js", [ "ccm.get", "https://ccmjs.github.io/akless-components/log/resources/configs.min.js", "greedy" ] ],
    "questions": [
      {
        "text": "How many of these answers are correct?",
        "description": "Select the correct answer from the following answers.",
        "answers": [
          {
            "text": "one",
            "comment": "Because you can't choose more than one answer."
          },
          "two",
          "three"
        ],
        "input": "radio",
        "correct": 0
      },
      {
        "text": "How many answers can be correct here?",
        "description": "Pay attention to the input field type.",
        "answers": [ 
          "absolutely none",
          {
            "text": "maximum of one",
            "comment": "Because you can choose more than one answer."
          },
          "more than one"
        ],
        "correct": [ true, false, true ]
      },
      {
        "text": "What is the solution to the following arithmetical tasks?",
        "description": "Please enter the solutions into the input fields.",
        "answers": [
          "=&nbsp; 1 + 1",
          "=&nbsp; 1 - 1",
          "=&nbsp;-1 - 1"
        ],
        "input": "number",
        "attributes": {
          "min": -2,
          "max": 2
        },
        "correct": [ 2, 0, -2 ]
      }
    ],
    "feedback": true,
    "navigation": true,
    "placeholder.finish": "Restart",
    "onfinish": { "restart": true },
    "root", "#component"
  }
};
