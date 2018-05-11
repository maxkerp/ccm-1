
window.LOG = "debug"

var quizConfig = {
  "css": [ "ccm.load", "https://ccmjs.github.io/akless-components/quiz/resources/weblysleek.css", { "context": "head", "url": "https://ccmjs.github.io/akless-components/libs/weblysleekui/font.css" } ],
  "feedback": true,
  "navigation": true,
  "placeholder.finish": "Restart",
  "onfinish": { "restart": true },
  "root": document.getElementById("component")
}

var quizA = {
  key: 'QmAbcd',
  "questions": [
    {
      "text": "Is this questions a distributed stored questions?",
      "description": "Does this document come from ipfs?",
      "answers": [
        {
          "text": "Yes",
          "comment": "Because we used orbit to fetch it"
        },
        "No",
        "Whatever"
      ],
      "input": "radio",
      "correct": 0
    }
  ]
};

var quizB = {
  key: 'orbitdb',
  "questions": [
    {
      "text": "What is orbitdb?",
      "answers": [
        "A library that utilzes CRDTs and ipfs to create distributed mutable storage",
        "Some NASA project",
        "Elon Musks new startup"
      ],
      "input": "radio",
      "correct": 0
    }
  ]
};

function openStore(string) {
  const name = string || "se2.lec03.quizes"

  ccm.dstore(name, function (store) {
    window.store = store
  });

}

function saveQuiz(quiz) {

  store.set(quiz, function (quiz) {

    console.debug(quiz)
  })
}


function listen() {
  C.addressStore.store.events.on('write', function (dbname, hash, entry) {

    console.debug(`Write for AddressStore occured ${dbname}! Entry was:${ entry }`)
  })
}

function startOrbit() {
  const config = {
    EXPERIMENTAL: {
      pubsub: true
    },
    config: {
      Addresses: {
        Swarm: [
          // Use IPFS dev signal server
          // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
          '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
          // Use local signal server
          // '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star',
        ]
      }
    }
  }

  const IPFS = new Ipfs(config)

  window.orbit = new OrbitDB(IPFS)
}

function createA (name, writeAccess = false) {
  let ops = {}

  if (writeAccess) {
    ops.write = ['*']
  }

  orbit.docs(name, ops).then(function (store) {

    window.store = store
  })
}



function createB(name = 'CCM.Debug', writeAccess = false, load = false) {
  const config = {
    EXPERIMENTAL: {
      pubsub: true
    },
    config: {
      Addresses: {
        Swarm: [
          // Use IPFS dev signal server
          // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
          '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
          // Use local signal server
          // '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star',
        ]
      }
    }
  }
  const IPFS = new Ipfs(config)

  window.orbit = new OrbitDB(IPFS)

  setTimeout(function () {
    let ops = {},
        store;

    if (writeAccess) {
      ops.write = ['*']
    }

    orbit.docs(name, ops).then(function (st) {

      if (load) {
        st.load()
      }
      store = st
      window.store = st
    })
  }, 1000)

}
