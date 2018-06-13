
const startComponentButton     = document.getElementById('componentButton'),
      typePeerAButton          = document.getElementById('typePeerA'),
      typePeerBButton          = document.getElementById('typePeerB'),
      evaluateTimestampsButton = document.getElementById('evaluateTimestamps')

startComponentButton.addEventListener('click', (e) => {
  startCollab()
})

typePeerAButton.addEventListener('click', (e) => {
  startTyping('', 50)
})

typePeerBButton.addEventListener('click', (e) => {
  startTyping('', 50)
})

evaluateTimestampsButton.addEventListener('click', (e) => {
  evaluateTimestamps()
})

function startCollab() {
  let componentNode = document.getElementById('component')
  ccm.start('collab', { dstore: 'scenario_3', root: componentNode })
}

function startTyping(peer, delay) {
  const item = window.TEXTAREA;

  if (peer === 'A') {
    typeText(item, window.text_peerA, delay);

  } else if (peer === 'B') {

    typeText(item, window.text_peerB, delay);
  } else {

    typeText(item, window.text_test, delay);
  }
};


function evaluateTimestamps() {
  MILLISECONDS = TIMESTAMPS.map((entries) => entries[1] - entries[0] )

  document.getElementById('average').innerHTML = getAverage()
  document.getElementById('median').innerHTML  = getMedian()
}

function getMedian() {
  let median,
      sorted = MILLISECONDS.slice();

  sorted.sort((a,b) => a - b)

  const half = sorted.length / 2 

  if ( half % 2 === 0) {
    median = (sorted[half - 1] + sorted[half]) / 2
  } else {
    median = sorted[Math.floor(half / 2)]
  }
  
  return median
}

function getAverage() {
  return MILLISECONDS.reduce((sum, curr) => sum + curr) / MILLISECONDS.length
}

function typeText(item, text, delay ) {
  for (let i = 0, p = Promise.resolve(); i <= text.length; i++) {
    p = p.then( () => {
      return new Promise((resolve) => {
        setTimeout(function () {

          const text_slice = text.slice(0,i)
          item.value = text_slice
          item.dispatchEvent(new KeyboardEvent('keyup'))
          resolve();
        }, delay)
      })
    });
  }
}

window.text_test = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.   Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet,"

window.text_peerA = `
Preamble

Whereas recognition of the inherent dignity and of the equal and inalienable rights of all members of the human family is the foundation of freedom, justice and peace in the world,

Whereas disregard and contempt for human rights have resulted in barbarous acts which have outraged the conscience of mankind, and the advent of a world in which human beings shall enjoy freedom of speech and belief and freedom from fear and want has been proclaimed as the highest aspiration of the common people,

Whereas it is essential, if man is not to be compelled to have recourse, as a last resort, to rebellion against tyranny and oppression, that human rights should be protected by the rule of law,

Whereas it is essential to promote the development of friendly relations between nations,

Whereas the peoples of the United Nations have in the Charter reaffirmed their faith in fundamental human rights, in the dignity and worth of the human person and in the equal rights of men and women and have determined to promote social progress and better standards of life in larger freedom,

Whereas Member States have pledged themselves to achieve, in co-operation with the United Nations, the promotion of universal respect for and observance of human rights and fundamental freedoms,

Whereas a common understanding of these rights and freedoms is of the greatest importance for the full realization of this pledge,

Now, Therefore THE GENERAL ASSEMBLY proclaims THIS UNIVERSAL DECLARATION OF HUMAN RIGHTS as a common standard of achievement for all peoples and all nations, to the end that every individual and every organ of society, keeping this Declaration constantly in mind, shall strive by teaching and education to promote respect for these rights and freedoms and by progressive measures, national and international, to secure their universal and effective recognition and observance, both among the peoples of Member States themselves and among the peoples of territories under their jurisdiction. 
  `;

window.text_peerB = `
Article 1.
 
 
All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.
Article 2.


Everyone is entitled to all the rights and freedoms set forth in this Declaration, without distinction of any kind, such as race, colour, sex, language, religion, political or other opinion, national or social origin, property, birth or other status. Furthermore, no distinction shall be made on the basis of the political, jurisdictional or international status of the country or territory to which a person belongs, whether it be independent, trust, non-self-governing or under any other limitation of sovereignty.
Article 3.


Everyone has the right to life, liberty and security of person.
Article 4.


No one shall be held in slavery or servitude; slavery and the slave trade shall be prohibited in all their forms.
Article 5.


No one shall be subjected to torture or to cruel, inhuman or degrading treatment or punishment.
Article 6.


Everyone has the right to recognition everywhere as a person before the law.
Article 7.


All are equal before the law and are entitled without any discrimination to equal protection of the law. All are entitled to equal protection against any discrimination in violation of this Declaration and against any incitement to such discrimination.
Article 8.


Everyone has the right to an effective remedy by the competent national tribunals for acts violating the fundamental rights granted him by the constitution or by law.
Article 9.


No one shall be subjected to arbitrary arrest, detention or exile.
Article 10.


Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him.
`
