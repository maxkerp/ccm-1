( function () {
  if ( !window.ccm ) {
    window.ccm = {
      components: {},
      callbacks:  {},
      files:      {}
    };
  }

  let cache = {};
  let db;

  const components = {};
  const waiting_lists = {};

  const RUNTIME = {

    version : () => '16.3.1',
    clear   : () => { cache = {}; },

    load: function () {

      const args = [ ...arguments ];

      const call = args.slice( 0 ); call.unshift( RUNTIME.load );

      let results = [];

      let waiting = false;

      let counter = 1;

      const callback = typeof args[ args.length - 1 ] === 'function' ? args.pop() : null;

      args.map( ( resource, i ) => {

        counter++;

        resource = RUNTIME.helper.clone( resource );

        if ( Array.isArray( resource ) ) { results[ i ] = []; serial( null ); return; }

        if ( !RUNTIME.helper.isObject( resource ) ) resource = { url: resource };

        const suffix = resource.url.split( '.' ).pop().toLowerCase();

        if ( !resource.context || resource.context === 'head' ) resource.context = document.head;

        if ( RUNTIME.helper.isInstance( resource.context ) ) resource.context = resource.context.element.parentNode;

        const operation = getOperation();

        if ( operation === loadCSS && resource.context !== document.head ) resource.ignore_cache = true;

        if ( operation === loadData && resource.ignore_cache === undefined ) resource.ignore_cache = true;

        if ( caching() ) return;

        if ( cache[ resource.url ] === undefined ) cache[ resource.url ] = null;

        operation();

        function serial( result ) {

          if ( result !== null ) results[ i ].push( result );

          if ( resource.length > 0 ) {

            const next = resource.shift();

            if ( Array.isArray( next ) ) { next.push( serial ); RUNTIME.load.apply( null, next ); }

            else RUNTIME.load( next, serial );

          }
          else check();

        }

        function getOperation() {

          switch ( resource.type ) {
            case 'css':   return loadCSS;
            case 'image': return loadImage;
            case 'data':  return loadData;
            case 'js':    return loadJS;
          }

          switch ( suffix ) {
            case 'css':
              return loadCSS;
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'png':
            case 'svg':
            case 'bmp':
              return loadImage;
            case 'js':
              return loadJS;
            default:
              return loadData;
          }

        }

        function caching() {

          if ( resource.ignore_cache ) return waiting;

          if ( cache[ resource.url ] === null ) {

            if ( waiting ) return true;

            waiting = true;

            if ( !waiting_lists[ resource.url ] ) waiting_lists[ resource.url ] = [];

            waiting_lists[ resource.url ].push( call );

            return true;

          }

          if ( cache[ resource.url ] !== undefined ) {

            results[ i ] = cache[ resource.url ];

            success(); return true;

          }

          return false;

        }

        function loadCSS() {

          let element = { tag: 'link', rel: 'stylesheet', type: 'text/css', href: resource.url };
          if ( resource.attr ) RUNTIME.helper.integrate( resource.attr, element );
          element = RUNTIME.helper.html( element );
          resource.context.appendChild( element );
          element.onload = success;

        }

        function loadImage() {

          const image = new Image();
          image.onload = success;
          image.src = resource.url;

        }

        function loadJS() {

          const filename = resource.url.split( '/' ).pop().replace( '.min.', '.' );

          ccm.files[ filename ] = null;

          let element = { tag: 'script', src: resource.url };
          if ( resource.attr ) RUNTIME.helper.integrate( resource.attr, element );
          element = RUNTIME.helper.html( element );
          resource.context.appendChild( element );
          element.onload = () => {

            const data = ccm.files[ filename ];

            delete ccm.files[ filename ];

            if ( data !== null ) successData( data ); else success();

          };

        }

        function loadData() {

          if ( !resource.method ) resource.method = 'GET';

          if ( resource.method === 'JSONP' ) jsonp(); else ajax();

          function jsonp() {

            const callback = 'callback' + RUNTIME.helper.generateKey();
            if ( !resource.params ) resource.params = {};
            resource.params.callback = 'ccm.callbacks.' + callback;
            ccm.callbacks[ callback ] = data => {
              resource.context.removeChild( element );
              delete ccm.callbacks[ callback ];
              successData( data );
            };

            let element = { tag: 'script', src: buildURL( resource.url, resource.params ) };
            if ( resource.attr ) RUNTIME.helper.integrate( resource.attr, element );
            element = RUNTIME.helper.html( element );
            element.src = element.src.replace( /&amp;/g, '&' );  // TODO: Why is this "&amp;" happening in ccm.helper.html?

            resource.context.appendChild( element );

          }

          function ajax() {
            const request = new XMLHttpRequest();
            request.open( resource.method, resource.method === 'GET' ? buildURL( resource.url, resource.params ) : resource.url, true );
            request.onreadystatechange = () => {
              if ( request.readyState === 4 && request.status === 200 )
                successData( RUNTIME.helper.regex( 'json' ).test( request.responseText ) ? JSON.parse( request.responseText ) : request.responseText );
            };
            request.send( resource.method === 'POST' ? JSON.stringify( resource.params ) : undefined );
          }

          function buildURL( url, data ) {
            return data ? url + '?' + params( data ).slice( 0, -1 ) : url;
            function params( obj, prefix ) {
              let result = '';
              for ( const i in obj ) {
                const key = prefix ? prefix + '[' + encodeURIComponent( i ) + ']' : encodeURIComponent( i );
                if ( typeof( obj[ i ] ) === 'object' )
                  result += params( obj[ i ], key );
                else
                  result += key + '=' + encodeURIComponent( obj[ i ] ) + '&';
              }
              return result;
            }

          }

        }

        function successData( data ) {

          if ( typeof data === 'string' && ( data.charAt( 0 ) === '[' || data.charAt( 0 ) === '{' ) ) data = JSON.parse( data );

          results[ i ] = cache[ resource.url ] = RUNTIME.helper.protect( data );

          success();

        }

        function success() {

          if ( results[ i ] === undefined ) results[ i ] = cache[ resource.url ] = resource.url;

          if ( waiting_lists[ resource.url ] )
            while ( waiting_lists[ resource.url ].length > 0 )
              RUNTIME.helper.action( waiting_lists[ resource.url ].shift() );

          check();

        }

      } );

      return check();

      function check() {

        counter--;

        if ( counter === 0 ) {

          if ( results.length <= 1 ) results = results[ 0 ];

          if ( callback ) callback( results );
          return results;

        }

      }

    },

    component: function ( component, config, callback ) {

      if ( typeof config === 'function' ) { callback = config; config = undefined; }

      if ( typeof component === 'string' ) {

        if ( component.indexOf( '.js' ) === -1 ) proceed( components[ component ] );

        else {

          var index = RUNTIME.helper.getIndex( component );

          if ( components[ index ] ) return proceed( components[ index ] );

          else RUNTIME.load( component, proceed );

        }

      }
      else proceed( component );

      return typeof component === 'string' && component.indexOf( '.js' ) === -1 && components[ component ] && true;

      function proceed( component ) {

        if ( !RUNTIME.helper.isObject( component ) ) return;

        setNameVersionIndex();

        if ( components[ component.index ] ) return finish();

        components[ component.index ] = component;

        ccm.components[ component.index ] = {};

        if ( !( 'customElements' in window ) ) RUNTIME.load( {
          url: 'https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/1.0.14/webcomponents-lite.js',
          integrity: 'sha384-TTXH4zkR6Kx22xssZjsMANEJr+byWdSVr/CwNZyegnManSjJsugFZC/SJzGWARHw',
          crossorigin: 'anonymous'
        }, proceed ); else return proceed();

        function proceed() {

          var version = getFrameworkVersion();

          if ( !ccm[ version ] ) RUNTIME.load( component.ccm, proceed ); else proceed();

          function proceed() {

            setup();

            defineCustomElement();

            if ( component.init ) { component.init( finish ); delete component.init; } else return finish();

            function setup() {

              component.instances = 0;         // add ccm instance counter
              component.ccm = ccm[ version ];  // add ccm framework reference

              component.instance = function ( config, callback ) { return RUNTIME.instance( component.index, config, callback ); };
              component.start    = function ( config, callback ) { return RUNTIME.start   ( component.index, config, callback ); };

              if ( !component.config ) component.config = {};

              component.config.ccm = component.ccm;

            }

            function defineCustomElement() {

              var name = 'ccm-' + component.index;
              if ( customElements.get( name ) ) return;
              window.customElements.define( name, class extends HTMLElement {
                connectedCallback() {
                  var _this = this;
                  RUNTIME.helper.wait( 1, function () {
                    if ( !document.body.contains( _this ) ) return;
                    var node = _this;
                    while ( node = node.parentNode )
                      if ( node.tagName && node.tagName.indexOf( 'CCM-' ) === 0 )
                        return;
                    var config = RUNTIME.helper.generateConfig( _this );
                    config.root = _this;
                    component.start( config );
                  } );
                }
              } );

            }

          }

          function getFrameworkVersion() {

            if ( typeof component.ccm === 'string' ) component.ccm = { url: component.ccm };

            var version = component.ccm.url.split( '/' ).pop().split( '-' );
            if ( version.length > 1 ) {
              version = version[ 1 ].split( '.' );
              version.pop();
              if ( version[ version.length - 1 ] === 'min' ) version.pop();
              version = version.join( '.' );
            }
            else version = 'latest';

            return version;

          }

        }

        function setNameVersionIndex() {

          if ( component.index ) {

            var array = component.index.split( '-' );

            component.name = array.shift();

            if ( array.length > 0 ) component.version = array;

          }

          component.index = component.name;

          if ( component.version )
            component.index += '-' + component.version.join( '-' );

        }

        function finish() {

          component = RUNTIME.helper.clone( components[ component.index ] );

          if ( config ) {

            if ( RUNTIME.helper.isElementNode( config ) ) config = { root: config };

            component.config = RUNTIME.helper.integrate( RUNTIME.helper.clone( config ), component.config );

            closure( component );

          }
          
          if ( callback ) callback( component );
          return component;

          function closure( component ) {

            component.instance = function ( config, callback ) { return perform( RUNTIME.instance, config, callback ); };
            component.start    = function ( config, callback ) { return perform( RUNTIME.start   , config, callback ); };

            function perform( method, config, callback ) {

              if ( typeof config === 'function' ) { callback = config; config = undefined; }

              if ( RUNTIME.helper.isElementNode( config ) ) config = { root: config };

              config = RUNTIME.helper.integrate( config, RUNTIME.helper.clone( component.config ) );

              return method( component.index, config, function ( instance ) {

                instance.component = component;

                if ( callback ) callback( instance );
              } );
              
            }

          }

        }

      }

    },

    instance: function ( component, config, callback ) {

      if ( typeof config === 'function' ) { callback = config; config = undefined; }

      var counter = 0;

      var result;

      var waiter = [];

      return recursive( component, config );

      function recursive( comp, cfg, prev_cfg, prev_key, parent, start ) {

        counter++;

        var dependency = [ 'ccm.instance', arguments[ 0 ], RUNTIME.helper.clone( cfg ) ];

        RUNTIME.component( comp, function ( comp ) { proceed( comp.index ); } );

        function proceed( index ) {

          if ( RUNTIME.helper.isDependency( cfg ) ) cfg = { key: cfg };
          if ( cfg && cfg.key ) {
            if ( RUNTIME.helper.isObject( cfg.key ) )
              return integrate( RUNTIME.helper.clone( cfg.key ) );
            else if ( RUNTIME.helper.isDependency( cfg.key ) )
              return cfg.key[ 0 ] === 'ccm.load' ? RUNTIME.load( cfg.key[ 1 ], integrate ) : RUNTIME.get( cfg.key[ 1 ], cfg.key[ 2 ], integrate );
            else proceed( cfg );
          }
          else return proceed( cfg );
          function integrate( dataset ) {
            RUNTIME.helper.integrate( cfg, dataset );
            delete dataset.key;
            return proceed( dataset );
          }

          function proceed( cfg ) {

            if ( components[ index ].instances === undefined ) return ccm.helper.wait( 500, function () { proceed( cfg ); } );

            if ( RUNTIME.helper.isElementNode( cfg ) ) cfg = { root: cfg };

            var instance = new components[ index ].Instance();

            components[ index ].instances++;                    // increment instance counter
            if ( prev_cfg ) prev_cfg[ prev_key ] = instance;    // set instance in instance configuration (previous recursive level)
            if ( parent ) instance.parent = parent;             // set parent instance
            if ( !result ) result = instance;                   // set result instance

            RUNTIME.helper.integrate( RUNTIME.helper.clone( components[ index ].config ), instance );  // set default ccm instance configuration
            if ( cfg ) {
              RUNTIME.helper.privatize( cfg, 'ccm', 'component', 'element', 'id', 'index', 'init', 'key', 'ready', 'start' );
              RUNTIME.helper.integrate( cfg, instance );           // integrate ccm instance configuration
            }
            instance.id = components[ index ].instances;        // set ccm instance id
            instance.index = index + '-' + instance.id;         // set ccm instance index
            instance.component = components[ index ];           // set ccm component reference
            var root;
            setElement();                                       // set website area

            solveDependencies( instance );

            if ( start ) instance.start( function () { check(); } ); else return check();

            function setElement() {

              if ( instance.root === 'parent' ) {
                instance.root = instance.parent.root;
                instance.element = instance.parent.element;
                return;
              }

              if ( instance.root === 'name' ) instance.root = instance.parent.element.querySelector( '#' + instance.component.name );

              if ( !instance.root ) instance.root = document.createElement( 'div' );


              var shadow = document.createElement( 'div' );
              shadow.id = 'ccm-' + instance.index;
              root = document.createElement( 'div' );
              RUNTIME.helper.setContent( root, shadow );
              document.head.appendChild( root );

              var element = RUNTIME.helper.html( { id: 'element' } );

              shadow = shadow.attachShadow( { mode: 'open' } );
              shadow.appendChild( element );

              instance.element = element;

            }

            function solveDependencies( instance_or_array ) {

              for ( var key in instance_or_array ) {

                var value = instance_or_array[ key ];

                if ( RUNTIME.helper.isDependency( value ) ) solveDependency( instance_or_array, key );

                else if ( typeof value === 'object' && value !== null ) {

                  if ( RUNTIME.helper.isNode( value ) || RUNTIME.helper.isInstance( value ) || RUNTIME.helper.isComponent( value ) ) continue;

                  solveDependencies( value );

                }

              }

              function solveDependency( instance_or_array, key ) {

                var action = instance_or_array[ key ];

                switch ( action[ 0 ] ) {

                  case 'ccm.load':
                    counter++;
                    action.shift();
                    setContext( action );
                    action.push( setResult ); RUNTIME.load.apply( null, action );
                    break;

                  case 'ccm.polymer':
                    counter++;

                    proceed();

                    function proceed() {

                      const url = action[ 1 ];
                      const name = url.split( '/' ).pop().split( '.' ).shift();
                      let config = action[ 2 ];
                      if ( !config ) {
                        config = {};
                        for ( const key in result )
                          if ( typeof result[ key ] === 'string' )
                            config[ key ] = result[ key ];
                      }

                      const link = RUNTIME.helper.html( { tag: 'link', rel: 'import', href: url } );
                      const polymer = document.createElement( name );
                      for ( const key in config )
                        polymer.setAttribute( key, config[ key ] );
                      document.head.appendChild( link );
                      document.body.appendChild( polymer );

                      link.onload = () => {
                        const element = document.createElement( 'div' );
                        element.appendChild( polymer );
                        [ ...document.head.querySelectorAll( '[scope^=' + name + ']' ) ].map( child => element.appendChild( child ) );
                        setResult( element );
                      };

                    }
                    break;

                  case 'ccm.module':
                    counter++;
                    const callback = 'callback' + RUNTIME.helper.generateKey();
                    ccm.callbacks[ callback ] = function ( result ) {
                      delete ccm.callbacks[ callback ];
                      RUNTIME.helper.removeElement( tag );
                      setResult( result );
                    };
                    const tag = RUNTIME.helper.html( { tag: 'script', type: 'module' } );
                    tag.text = "import * as obj from '"+action[1]+"'; ccm.callbacks['"+callback+"']( obj )";
                    document.head.appendChild( tag );
                    break;

                  case 'ccm.component':
                    counter++;
                    if ( !action[ 2 ] ) action[ 2 ] = {};
                    action[ 2 ].parent = instance;
                    RUNTIME.component( action[ 1 ], action[ 2 ], function ( result ) { setResult( result ); } );
                    break;

                  case 'ccm.instance':
                  case 'ccm.start':
                    waiter.push( [ recursive, action[ 1 ], action[ 2 ], instance_or_array, key, instance, action[ 0 ] === 'ccm.start' ] );
                    break;

                  case 'ccm.proxy':
                    proxy( action[ 1 ], action[ 2 ], instance_or_array, key, instance );
                    break;

                  case 'ccm.store':
                    counter++;
                    if ( !action[ 1 ] ) action[ 1 ] = {};
                    action[ 1 ].parent = instance;
                    RUNTIME.store( action[ 1 ], setResult );
                    break;

                  case 'ccm.get':
                    counter++;
                    RUNTIME.get( action[ 1 ], action[ 2 ], setResult );
                    break;

                  case 'ccm.set':
                    counter++;
                    RUNTIME.set( action[ 1 ], action[ 2 ], setResult );
                    break;

                  case 'ccm.del':
                    counter++;
                    RUNTIME.del( action[ 1 ], action[ 2 ], setResult );
                    break;
                }

                function setContext( resources ) {
                  for ( var i = 0; i < resources.length; i++ ) {
                    if ( Array.isArray( resources[ i ] ) ) { setContext( resources[ i ] ); continue; }
                    if ( !RUNTIME.helper.isObject( resources[ i ] ) ) resources[ i ] = { url: resources[ i ] };
                    if ( !resources[ i ].context ) resources[ i ].context = instance.element.parentNode;
                  }
                }

                function setResult( result ) {

                  instance_or_array[ key ] = result;

                  check();

                }

                function proxy( component, config, instance_or_array, key, parent ) {

                  RUNTIME.helper.isDependency( config ) ? RUNTIME.get( config[ 1 ], config[ 2 ], proceed ) : proceed( config );

                  function proceed( config ) {

                    instance_or_array[ key ] = {
                      component: component,
                      parent: parent,
                      start: function ( callback ) {
                        delete this.component;
                        delete this.start;
                        if ( !config ) config = {};
                        RUNTIME.helper.integrate( this, config );
                        RUNTIME.start( component, config, function ( instance ) {
                          instance_or_array[ key ] = instance;
                          if ( callback ) callback();
                        } );
                      }
                    };

                  }

                }

              }

            }

            function check() {

              counter--;

              if ( counter === 0 ) {

                RUNTIME.helper.setContent( instance.root, root.firstElementChild );
                document.head.removeChild( root );

                if ( waiter.length > 0 ) return RUNTIME.helper.action( waiter.shift() );  // recursive call

                instance.dependency = dependency;

                initialize( result, function () {


                  if ( callback ) callback( result );

                } );

              }

              return counter === 0 ? result : null;

            }

            function initialize( instance, callback ) {

              var results = [ instance ];

              find( instance );


              var i = 0; init();

              function find( obj ) {

                var inner = [];

                for ( var key in obj ) {
                  var value = obj[ key ];

                  if ( RUNTIME.helper.isInstance( value ) && key !== 'parent' && !RUNTIME.helper.isProxy( value) ) inner.push( value );

                  else if ( Array.isArray( value ) || RUNTIME.helper.isObject( value ) ) {

                    if ( RUNTIME.helper.isNode( value ) || RUNTIME.helper.isComponent( value ) || RUNTIME.helper.isInstance( value ) ) continue;

                    inner.push( value );

                  }

                }

                inner.map( function ( obj ) { if ( RUNTIME.helper.isInstance( obj ) ) results.push( obj ); } );

                inner.map( function ( obj ) { find( obj ); } );

              }

              function init() {

                if ( i === results.length ) return ready();

                var obj = results[ i ]; i++;

                if ( obj.init ) obj.init( function () { delete obj.init; init(); } ); else init();

              }

              function ready() {

                if ( results.length === 0 ) return callback();

                var obj = results.pop();

                delete obj.init;

                if ( obj.ready ) { var tmp = obj.ready; delete obj.ready; tmp( ready ); } else ready();

              }

            }

          }

        }

      }

    },

    start: function ( component, config, callback ) {

      if ( typeof config === 'function' ) { callback = config; config = undefined; }

      RUNTIME.instance( component, config, function ( instance ) {

        instance.start( function () {

          if ( callback ) callback( instance );

        } );

      } );

    },

    store: ( settings, callback ) => {
      // IMPROVE:
      // This line is doing 'empty work', settings is the same as before.
      // Using let or var would create a copy for the given scope, but then
      // the tests fail.
      settings = RUNTIME.helper.clone( settings );

      if ( !RUNTIME.helper.isDatastoreSettings( settings ) ) { settings = { local: settings }; }
      if ( !settings.local ) { settings.local = {}; }

      if ( typeof settings.local === 'string' || RUNTIME.helper.isResourceDataObject( settings.local ) ) {
        RUNTIME.load( settings.local, proceed );
      } else {
        proceed( settings.local );
      }

      function proceed( datasets ) {
        const store = new Datastore();

        settings.local = RUNTIME.helper.clone( datasets );
        RUNTIME.helper.integrate( settings, store );

        store.init( () => {

          if (callback) { callback( store ) };
        });

      }
    },

    get: ( settings, key_or_query, callback ) => {

      RUNTIME.store( settings, (store) => {
        let property;

        if ( typeof key_or_query === 'string' ) {
          property     = key_or_query.split( '.' );
          key_or_query = property.shift();
          property     = property.join( '.' );
        }

        store.get( key_or_query, (result) => {
          let ret = property ? RUNTIME.helper.deepValue( result, property ) : result;

          callback( ret );
        });
      })
    },

    set: ( settings, priodata, callback ) => RUNTIME.store( settings, store => store.set( priodata, callback ) ),

    del: ( settings, key, callback ) => RUNTIME.store( settings, store => store.del( key, callback ) ),

    context: {

      find: ( instance, property, not_me ) => {

        const start = instance;
        if ( not_me ) instance = instance.parent;
        do
          if ( RUNTIME.helper.isObject( instance ) && instance[ property ] !== undefined && instance[ property ] !== start )
            return instance[ property ];
        while ( instance = instance.parent );

      },

      root: function ( instance ) {

        while ( instance.parent )
          instance = instance.parent;

        return instance;

      }

    },

    helper: {

      action: function ( action, context ) {

        if ( typeof action === 'function' ) return action();

        if ( typeof action !== 'object' )
          action = action.split( ' ' );

        if ( typeof action[ 0 ] === 'function' )
          return action[ 0 ].apply( window, action.slice( 1 ) );
        else
        if ( action[ 0 ].indexOf( 'this.' ) === 0 )
          return this.executeByName( action[ 0 ].substr( 5 ), action.slice( 1 ), context );
        else
          return this.executeByName( action[ 0 ], action.slice( 1 ) );
      },

      append: function ( parent, node ) {

        node = RUNTIME.helper.protect( node );
        parent.appendChild( node );

      },

      arrToObj: function arrToObj( obj, key ) {

        var arr = key ? obj[ key ] : obj;
        if ( !Array.isArray( arr ) ) return;

        var result = {};
        arr.map( function ( value ) { result[ value ] = true; } );
        if ( key ) obj[ key ] = result;
        return result;

      },

      cleanObject: function ( obj ) {

        for ( var key in obj )
          if ( !obj[ key ] )
            delete obj[ key ];
          else if ( typeof obj[ key ] === 'object' && !RUNTIME.helper.isNode( obj[ key ] ) && !RUNTIME.helper.isInstance( obj[ key ] ) )
            RUNTIME.helper.cleanObject( obj[ key ] );

        return obj;
      },

      clone: function ( value ) {

        return recursive( value );

        function recursive( value ) {

          if ( RUNTIME.helper.isNode( value ) || RUNTIME.helper.isInstance( value ) ) return value;

          if ( Array.isArray( value ) || RUNTIME.helper.isObject( value ) ) {
            var copy = Array.isArray( value ) ? [] : {};
            for ( var i in value )
              copy[ i ] = recursive( value[ i ] );
            return copy;
          }

          return value;

        }

      },

      compareVersions: ( a, b ) => {

        if ( a === b ) return 0;
        const a_arr = a.split( '.' );
        const b_arr = b.split( '.' );
        for ( let i = 0; i < 3; i++ ) {
          const x = parseInt( a_arr[ i ] );
          const y = parseInt( b_arr[ i ] );
          if      ( x < y ) return -1;
          else if ( x > y ) return  1;
        }
        return 0;

      },

      convertObjectKeys: function ( obj ) {

        var keys = Object.keys( obj );
        keys.map( function ( key ) {
          if ( key.indexOf( '.' ) !== -1 ) {
            RUNTIME.helper.deepValue( obj, key, obj[ key ] );
            delete obj[ key ];
          }
        } );
        return obj;

      },

      dataset: ( settings, callback, _ ) => {

        if ( RUNTIME.helper.isDatastore( settings ) ) settings = { store: settings };

        settings = RUNTIME.helper.clone( settings );

        if ( !settings || !RUNTIME.helper.isDatastore( settings.store ) ) return callback( settings );

        if ( RUNTIME.helper.isKey( callback ) ) { settings.key = callback; callback = _; }

        if ( !settings.key ) settings.key = RUNTIME.helper.generateKey();

        const user = RUNTIME.context.find( settings.store, 'user' );

        user && ( settings.login || settings.user ) ? user.login( proceed ) : proceed();

        function proceed() {

          if ( user && settings.user && user.isLoggedIn() ) settings.key = [ user.data().user, settings.key ];

          settings.store.get( settings.key, dataset => callback( dataset === null ? { key: settings.key } : dataset ) );

        }

      },

      decodeObject: ( str ) => {

        if ( typeof str === 'string' ) return JSON.parse( str.replace( /'/g, '"' ) );
        if ( typeof str === 'object' && !RUNTIME.helper.isNode( str ) && !RUNTIME.helper.isInstance( str ) )
          for ( const key in str )
            str[ key ] = RUNTIME.helper.decodeObject( str[ key ] );
        return str;

      },

      deepValue: function ( obj, key, value ) {

        return recursive( obj, key.split( '.' ), value );

        function recursive( obj, key, value ) {

          if ( !obj ) return;
          var next = key.shift();
          if ( key.length === 0 )
            return value !== undefined ? obj[ next ] = value : obj[ next ];
          if ( !obj[ next ] && value !== undefined ) obj[ next ] = isNaN( key[ 0 ] ) ? {} : [];
          return recursive( obj[ next ], key, value );  // recursive call

        }

      },

      encodeObject: ( obj, inner ) => {

        if ( typeof obj !== 'object' ) return obj;
        if ( !inner ) return JSON.stringify( obj ).replace( /"/g, "'" );
        for ( const key in obj )
          if ( typeof obj[ key ] === 'object' )
            obj[ key ] = JSON.stringify( obj[ key ] ).replace( /"/g, "'" );
        return obj;

      },

      encodeDependencies: ( value ) => {

        if ( RUNTIME.helper.isDependency( value ) )
          return JSON.stringify( value ).replace( /"/g, "'" );

        if ( typeof value !== 'object' || RUNTIME.helper.isNode( value ) || RUNTIME.helper.isInstance( value ) ) return value;

        for ( const key in value )
          value[ key ] = RUNTIME.helper.encodeDependencies( value[ key ] );

        return value;
      },

      escapeHTML: ( value ) => {

        const text = document.createTextNode( value );
        const div = document.createElement( 'div' );
        div.appendChild( text );
        return div.innerHTML;

      },

      executeByName: function ( functionName, args, context ) {

        if (!context) context = window;
        var namespaces = functionName.split( '.' );
        functionName = namespaces.pop();
        for ( var i = 0; i < namespaces.length; i++ )
          context = context[ namespaces[ i ]];
        return context[ functionName ].apply( context, args );
      },

      fillForm: ( element, data ) => {

        data = RUNTIME.helper.clone( RUNTIME.helper.protect( data ) );
        const dot = RUNTIME.helper.toDotNotation( data );
        for ( const key in dot ) data[ key ] = dot[ key ];
        for ( const key in data ) {
          if ( !data[ key ] ) continue;
          if ( typeof data[ key ] === 'object' ) data[ key ] = RUNTIME.helper.encodeObject( data[ key ] );
          if ( typeof data[ key ] === 'string' ) data[ key ] = RUNTIME.helper.unescapeHTML( data[ key ] );
          [ ...element.querySelectorAll( '[name="' + key + '"]' ) ].map( input => {
            if ( input.type === 'checkbox' ) {
              if ( input.value && typeof data[ key ] === 'string' && data[ key ].charAt( 0 ) === '[' )
                RUNTIME.helper.decodeObject( data[ key ] ).map( value => { if ( value === input.value ) input.checked = true; } );
              else
                input.checked = true;
            }
            else if ( input.type === 'radio' && data[ key ] === input.value )
              input.checked = true;
            else if ( input.tagName.toLowerCase() === 'select' ) {
              if ( input.hasAttribute( 'multiple' ) ) data[ key ] = RUNTIME.helper.decodeObject( data[ key ] );
              [ ...input.querySelectorAll( 'option' ) ].map( option => {
                if ( input.hasAttribute( 'multiple' ) )
                  data[ key ].map( value => { value = RUNTIME.helper.encodeObject( value ); if ( value === ( option.value ? option.value : option.innerHTML.trim() ) ) option.selected = true; } );
                else if ( data[ key ] === ( option.value ? option.value : option.innerHTML.trim() ) )
                  option.selected = true;
              } );
            }
            else if ( input.value === undefined )
              input.innerHTML = data[ key ];
            else
              input.value = data[ key ];
          } );
        }

      },

      filterProperties: function ( obj, properties ) {
        var result = {};
        properties = RUNTIME.helper.makeIterable( arguments );
        properties.shift();
        properties.map( function ( property ) {
          result[ property ] = obj[ property ];
        } );
        return result;
      },

      findParentElementByClass: function ( elem, value ) {

        while ( elem && elem.classList && !elem.classList.contains( value ) )
          elem = elem.parentNode;
        return elem.classList.contains( value ) ? elem : null;

      },

      format: function ( data, values ) {

        var temp = [[],[],{}];

        data = JSON.stringify( data, function ( key, val ) {
          if ( typeof val === 'function' ) { temp[ 0 ].push( val ); return '%$0%'; }
          return val;
        } );

        var obj_mode = data.indexOf( '{' ) === 0;

        for ( var i = 1; i < arguments.length; i++ ) {
          if ( typeof arguments[ i ] === 'object' )
            for ( var key in arguments[ i ] ) {
              if ( typeof arguments[ i ][ key ] === 'string' )
                arguments[ i ][ key ] = escape( arguments[ i ][ key ] );
              else if ( obj_mode ) {
                temp[ 2 ][ key ] = arguments[ i ][ key ];
                arguments[ i ][ key ] = '%$2%'+key+'%';
              }
              data = data.replace( new RegExp( '%'+key+'%', 'g' ), arguments[ i ][ key ] );
            }
          else {
            if ( typeof arguments[ i ] === 'string' )
              arguments[ i ] = escape( arguments[ i ] );
            else if ( obj_mode ) {
              temp[ 1 ].push( arguments[ i ] );
              arguments[ i ] = '%$1%';
            }
            data = data.replace( /%%/, arguments[ i ] );
          }
        }

        return JSON.parse( data, function ( key, val ) {
          if ( val === '%$0%' ) return temp[ 0 ].shift();
          if ( val === '%$1%' ) return temp[ 1 ].shift();
          if ( typeof val === 'string' && val.indexOf( '%$2%' ) === 0 ) return temp[ 2 ][ val.split( '%' )[ 2 ] ];
          return val;
        } );

        function escape( string ) {
          return string.replace( /"/g, "'" ).replace( /\\/g, '\\\\' ).replace( /\n/g, '\\n' ).replace( /\r/g, '\\r' ).replace( /\t/g, '\\t' ).replace( /\f/g, '\\f' );
        }

      },

      formData: ( element ) => {

        const data = {};
        [ ...element.querySelectorAll( '[name]' ) ].map( input => {
          if ( input.type === 'checkbox' ) {
            const value = input.checked ? ( input.value === 'on' ? true : input.value ) : ( input.value === 'on' ? false : '' );
            const multi = [ ...element.querySelectorAll( '[name="' + input.name + '"]' ) ].length > 1;
            if ( multi ) {
              if ( !data[ input.name ] ) data[ input.name ] = [];
              data[ input.name ].push( value );
            }
            else data[ input.name ] = value;
          }
          else if ( input.type === 'radio' ) {
            data[ input.name ] = input.checked ? input.value : ( data[ input.name ] ? data[ input.name ] : '' );
          }
          else if ( input.tagName.toLowerCase() === 'select' ) {
            let result = [];
            [ ...input.querySelectorAll( 'option' ) ].map( option => option.selected && result.push( option.value ? option.value : option.inner ) );
            switch ( result.length ) {
              case 0: result = '';          break;
              case 1: result = result[ 0 ]; break;
            }
            data[ input.name ] = result;
          }
          else if ( input.type === 'number' || input.type === 'range' ) {
            let value = parseInt( input.value );
            if ( isNaN( value ) ) value = '';
            data[ input.name ] = value;
          }
          else if ( input.value !== undefined )
            data[ input.name ] = input.value;
          else
            data[ input.getAttribute( 'name' ) ] = input.innerHTML;
          try {
            if ( typeof data[ input.name ] === 'string' && RUNTIME.helper.regex( 'json' ).test( data[ input.name ] ) )
              data[ input.name ] = RUNTIME.helper.decodeObject( data[ input.name ] );
          } catch ( err ) {}
          if ( typeof data[ input.name ] === 'string' )
            data[ input.name ] = RUNTIME.helper.escapeHTML( data[ input.name ] );
        } );
        return RUNTIME.helper.protect( RUNTIME.helper.solveDotNotation( data ) );

      },

      generateConfig: function ( node ) {

        var config = {};
        catchAttributes( node, config );
        catchInnerTags( node );
        return config;

        function catchAttributes( node, obj ) {

          RUNTIME.helper.makeIterable( node.attributes ).map( function ( attr ) {
            if ( attr.name !== 'src' ||
              ( node.tagName.indexOf( 'CCM-COMPONENT' ) !== 0
                && node.tagName.indexOf( 'CCM-INSTANCE'  ) !== 0
                && node.tagName.indexOf( 'CCM-PROXY'     ) !== 0 ) )
              try {
                obj[ attr.name ] = attr.value.charAt( 0 ) === '{' || attr.value.charAt( 0 ) === '[' ? JSON.parse( attr.value ) : prepareValue( attr.value );
              } catch ( err ) {}
          } );

        }

        function catchInnerTags( node ) {

          config.childNodes = [];
          RUNTIME.helper.makeIterable( node.childNodes ).map( function ( child ) {
            if ( child.tagName && child.tagName.indexOf( 'CCM-' ) === 0 ) {
              var split = child.tagName.toLowerCase().split( '-' );
              if ( split.length < 3 ) split[ 2 ] = split[ 1 ];
              switch ( split[ 1 ] ) {
                case 'load':
                  RUNTIME.helper.deepValue( config, split[ 2 ], interpretLoadTag( child, split[ 2 ] ) );
                  break;
                case 'component':
                case 'instance':
                case 'proxy':
                  RUNTIME.helper.deepValue( config, split[ 2 ], [ 'ccm.' + split[ 1 ], child.getAttribute( 'src' ) || split[ 2 ], RUNTIME.helper.generateConfig( child ) ] );
                  break;
                case 'store':
                case 'get':
                  var settings = {};
                  catchAttributes( child, settings );
                  var key = settings.key;
                  delete settings.key;
                  RUNTIME.helper.deepValue( config, split[ 2 ], [ 'ccm.' + split[ 1 ], settings, key ] );
                  break;
                case 'list':
                  var list = null;
                  RUNTIME.helper.makeIterable( child.children ).map( function ( entry ) {
                    if ( entry.tagName && entry.tagName.indexOf( 'CCM-ENTRY' ) === 0 ) {
                      var value = prepareValue( entry.getAttribute( 'value' ) );
                      var split = entry.tagName.toLowerCase().split( '-' );
                      if ( !list )
                        list = split.length < 3 ? [] : {};
                      if ( split.length < 3 )
                        list.push( value );
                      else
                        RUNTIME.helper.deepValue( list, split[ 2 ], value );
                    }
                  } );
                  if ( !list ) list = {};
                  catchAttributes( child, list );
                  if ( list ) RUNTIME.helper.deepValue( config, split[ 2 ], list );
                  break;
                default:
                  config.childNodes.push( child );
                  node.removeChild( child );
              }
            }
            else {
              config.childNodes.push( child );
              node.removeChild( child );
            }
          } );
          if ( config.inner ) return;
          config.inner = RUNTIME.helper.html( {} );
          config.childNodes.map( function ( child ) {
            config.inner.appendChild( child );
          } );
          delete config.childNodes;
          if ( !config.inner.hasChildNodes() ) delete config.inner;

          function interpretLoadTag( node ) {

            var params = generateParameters( node );
            if ( !Array.isArray( params ) ) params = [ params ];
            params.unshift( 'ccm.load' );
            if ( node.hasAttribute( 'head' ) ) params.push( true );
            return params;

            function generateParameters( node ) {

              if ( node.hasAttribute( 'src' ) ) {
                if ( node.children.length === 0 )
                  return node.getAttribute( 'src' );
                var data = {};
                RUNTIME.helper.makeIterable( node.children ).map( function ( child ) {
                  if ( child.tagName && child.tagName.indexOf( 'CCM-DATA-' ) === 0 )
                    data[ child.tagName.toLowerCase().split( '-' )[ 2 ] ] = child.getAttribute( 'value' );
                } );
                return [ node.getAttribute( 'src' ), data ];
              }
              var params = [];
              RUNTIME.helper.makeIterable( node.children ).map( function ( child ) {
                if ( child.tagName === 'CCM-SERIAL' && ( node.tagName === 'CCM-PARALLEL' || node.tagName.indexOf( 'CCM-LOAD' ) === 0 )
                    || child.tagName === 'CCM-PARALLEL' && node.tagName === 'CCM-SERIAL' )
                  params.push( generateParameters( child ) );
              } );
              return params;

            }

          }

        }

        function prepareValue( value ) {
          if ( value === 'true'      ) return true;
          if ( value === 'false'     ) return false;
          if ( value === 'null'      ) return null;
          if ( value === 'undefined' ) return undefined;
          if ( value === ''          ) return '';
          if ( !isNaN( value )       ) return parseInt( value );
          return value;
        }

      },

      generateKey: function () {

        return Date.now() + 'X' + Math.random().toString().substr( 2 );

      },

      getElementID: function ( instance ) {

        return 'ccm-' + instance.index;

      },

      getIndex: function ( url ) {

        if ( url.indexOf( '.js' ) === -1 ) return url;

        var filename = url.split( '/' ).pop();

        if ( !RUNTIME.helper.regex( 'filename' ).test( filename ) ) return '';

        var split = filename.split( '.' );
        if ( split[ 0 ] === 'ccm' )
          split.shift();
        split.pop();
        if ( split[ split.length - 1 ] === 'min' )
          split.pop();
        return split.join( '-' );

      },

      hide: function ( instance ) {
        instance.element.parentNode.appendChild( RUNTIME.helper.loading( instance ) );
        instance.element.style.display = 'none';
      },

      html: function( html, values ) {

        if ( typeof html === 'string' ) html = document.createRange().createContextualFragment( html );

        if ( window.jQuery && html instanceof jQuery ) {
          html = html.get();
          const fragment = document.createDocumentFragment();
          html.map( elem => fragment.appendChild( elem ) );
          html = fragment;
        }

        if ( RUNTIME.helper.isNode( html ) ) return html;

        html = RUNTIME.helper.clone( html );

        if ( arguments.length > 1 ) html = RUNTIME.helper.format.apply( this, arguments );

        if ( Array.isArray( html ) ) {

          var result = [];
          for ( var i = 0; i < html.length; i++ )
            result.push( RUNTIME.helper.html( html[ i ] ) );  // recursive call
          return result;

        }

        if ( typeof html !== 'object' ) return html;

        var element = document.createElement( RUNTIME.helper.htmlEncode( html.tag || 'div' ) );

        delete html.tag; delete html.key;

        for ( var key in html ) {

          var value = html[ key ];

          switch ( key ) {

            case 'async':
            case 'autofocus':
            case 'checked':
            case 'defer':
            case 'disabled':
            case 'ismap':
            case 'multiple':
            case 'required':
            case 'selected':
              if ( value ) element[ key ] = true;
              break;
            case 'readonly':
              if ( value ) element.readOnly = true;
              break;

            case 'inner':
              if ( typeof value === 'string' || typeof value === 'number' ) { element.innerHTML = value; break; }
              var children = this.html( value );  // recursive call
              if ( !Array.isArray( children ) )
                children = [ children ];
              for ( var i = 0; i < children.length; i++ )
                if ( RUNTIME.helper.isNode( children[ i ] ) )
                  element.appendChild( children[ i ] );
                else
                  element.innerHTML += children[ i ];
              break;

            default:
              if ( key.indexOf( 'on' ) === 0 && typeof value === 'function' )  // is HTML event
                element.addEventListener( key.substr( 2 ), value );
              else                                                             // is HTML value attribute
                element.setAttribute( key, RUNTIME.helper.htmlEncode( value ) );
          }

        }

        return RUNTIME.helper.protect( element );

      },

      htmlEncode: function ( value, trim, quot ) {

        if ( typeof value !== 'string' ) value = value.toString();
        value = trim || trim === undefined ? value.trim() : value;
        var tag = document.createElement( 'span' );
        tag.innerHTML = value;
        value = tag.textContent;
        value = quot || quot === undefined ? value.replace( /"/g, '&quot;' ) : value;
        return value;

      },

      integrate: function ( priodata, dataset, as_defaults ) {

        if ( !priodata ) return dataset;

        if ( !dataset ) return priodata;

        for ( var key in priodata ) {

          if ( !as_defaults || RUNTIME.helper.deepValue( dataset, key ) === undefined ) RUNTIME.helper.deepValue( dataset, key, priodata[ key ] );

        }

        return dataset;

      },

      isComponent: function ( value ) {

        return RUNTIME.helper.isObject( value ) && value.Instance && true;

      },

      isDataset: ( value ) => {
        return RUNTIME.helper.isObject( value ) && RUNTIME.helper.isKey( value.key );
      },

      isDatastore: ( value ) => {
        return RUNTIME.helper.isObject( value ) && value.get && value.set && value.del && true;
      },

      isDatastoreSettings: ( value ) => {
        // WTF! Helper tests don't run when using return keyword
        !!( value.local || value.store );
      },

      isDependency: function ( value ) {

        if ( Array.isArray( value ) )
          if ( value.length > 0 )
            switch ( value[ 0 ] ) {
              case 'ccm.load':
              case 'ccm.component':
              case 'ccm.instance':
              case 'ccm.proxy':
              case 'ccm.start':
              case 'ccm.store':
              case 'ccm.get':
              case 'ccm.set':
              case 'ccm.del':
              case 'ccm.module':
              case 'ccm.polymer':
                return true;
            }

        return false;

      },

      isElementNode: function ( value ) {

        return value instanceof Element;
      },

      isFirefox: function () {

        return navigator.userAgent.search( 'Firefox' ) > -1;
      },

      isGoogleChrome: function () {

        return /Chrome/.test( navigator.userAgent ) && /Google Inc/.test( navigator.vendor );
      },

      isInstance: function ( value ) {

        return RUNTIME.helper.isObject( value ) && value.component && true;
      },

      isKey: ( value ) => {

        if ( typeof value === 'string' ) return RUNTIME.helper.regex( 'key' ).test( value );

        if ( Array.isArray( value ) ) {
          for ( let i = 0; i < value.length; i++ )
            if ( !RUNTIME.helper.regex( 'key' ).test( value[ i ] ) )
              return false;
          return true;
        }

        return false;
      },

      isNode: function ( value ) {

        return value instanceof Node;

      },

      isObject: function ( value ) {

        return typeof value === 'object' && value !== null && !Array.isArray( value );

      },

      isProxy: function ( value ) {

        return RUNTIME.helper.isInstance( value ) && typeof value.component === 'string';

      },

      isResourceDataObject: ( value ) => {
        // WTF Seriously?
        RUNTIME.helper.isObject( value ) && value.url && ( value.context || value.method || value.params || value.attr || value.ignore_cache || value.type ) && true
      },

      isSafari: function () {

        return /^((?!chrome|android).)*safari/i.test( navigator.userAgent );
      },

      isSubset: function ( obj, other ) {

        for ( var i in obj )
          if ( typeof obj[ i ] === 'object' && typeof other[ i ] === 'object' ) {
            if ( JSON.stringify( obj[ i ] ) !== JSON.stringify( other[ i ] ) )
              return false;
          }
          else if ( obj[ i ] !== other[ i ] )
            return false;
        return true;

      },

      loading: function ( instance ) {

        if ( !instance.element.parentNode.querySelector( '#ccm_keyframe' ) ) {
          var style = document.createElement( 'style' );
          style.id = 'ccm_keyframe';
          style.appendChild( document.createTextNode( '@keyframes ccm_loading { to { transform: rotate(360deg); } }' ) );
          instance.element.parentNode.appendChild( style );
        }

        return RUNTIME.helper.html( { class: 'ccm_loading', inner: { style: 'display: inline-block; width: 0.5em; height: 0.5em; border: 0.15em solid #009ee0; border-right-color: transparent; border-radius: 50%; animation: ccm_loading 1s linear infinite;' } } );
      },

      log: ( message ) => { console.log( '[ccm]', message ) },

      makeIterable: function ( array_like ) {
        return Array.prototype.slice.call( array_like );
      },

      onFinish: ( instance, results ) => {

        const settings = instance.onfinish;

        if ( !settings ) return;

        if ( results === undefined && instance.getValue ) results = instance.getValue();

        if ( typeof settings === 'function' ) return settings( instance, results );

        if ( typeof settings === 'string' ) return this.executeByName( settings, [ instance, results ] );

        if ( settings.confirm && confirm( !settings.confirm ) ) return;

        const user = RUNTIME.context.find( instance, 'user' );

        if ( settings.login && user ) user.login( proceed ); else proceed();

        function proceed() {

          if ( settings.log ) console.log( results );

          if ( settings.clear ) instance.element.innerHTML = '';

          if ( RUNTIME.helper.isObject( settings.store ) && settings.store.settings && RUNTIME.helper.isObject( results ) ) {

            const dataset = RUNTIME.helper.clone( results );

            if ( settings.store.key && !dataset.key ) dataset.key = settings.store.key;
            if ( settings.store.user && user && user.isLoggedIn() ) dataset.key = [ user.data().user, dataset.key || RUNTIME.helper.generateKey() ];

            if ( settings.store.permissions ) dataset._ = settings.store.permissions;

            if ( user ) settings.store.settings.user = user;

            RUNTIME.set( settings.store.settings, dataset, proceed );

          }
          else proceed();

          function proceed() {

            if ( settings.restart ) instance.start( proceed ); else proceed();

            function proceed() {

              if ( settings.render )
                if ( RUNTIME.helper.isObject( settings.render ) && settings.render.component ) {
                  let config = settings.render.config;
                  if ( !config ) config = {};
                  RUNTIME.start( settings.render.component, config, result => {
                    RUNTIME.helper.replace( result.root, instance.root );
                    proceed();
                  } );
                  return;
                }
                else RUNTIME.helper.replace( RUNTIME.helper.html( settings.render ), instance.root );
              proceed();

              function proceed() {

                if ( settings.alert ) alert( settings.alert );

                settings.callback && settings.callback( instance, results );

              }

            }

          }

        }

      },

      prepend: function ( parent, node ) {

        node = RUNTIME.helper.protect( node );
        if ( parent.hasChildNodes() )
          parent.insertBefore( node, parent.firstChild );
        else
          parent.appendChild( node );

      },

      privatize: function ( instance, properties ) {

        var obj = {};
        if ( properties )
          for ( var i = 1; i < arguments.length; i++ )
            privatizeProperty( arguments[ i ] );
        else
          for ( var key in instance )
            privatizeProperty( key )
        return obj;

        function privatizeProperty( key ) {
          switch ( key ) {
            case 'ccm':
            case 'component':
            case 'dependency':
            case 'element':
            case 'id':
            case 'index':
            case 'onfinish':
            case 'parent':
            case 'root':
              break;
            default:
              if ( RUNTIME.helper.isInstance( instance[ key ] ) && instance[ key ].parent && instance[ key ].parent.index === instance.index ) return;
              if ( typeof instance[ key ] === 'function' ) return;
              if ( instance[ key ] !== undefined ) obj[ key ] = instance[ key ];
              delete instance[ key ];
          }
        }

      },

      protect: function ( value ) {

        if ( typeof value === 'string' ) {
          var tag = document.createElement( 'div' );
          tag.innerHTML = value;
          RUNTIME.helper.makeIterable( tag.getElementsByTagName( 'script' ) ).map( function ( script ) {
            script.parentNode.removeChild( script );
          } );
          return tag.innerHTML;
        }

        if ( RUNTIME.helper.isElementNode( value ) )
          RUNTIME.helper.makeIterable( value.getElementsByTagName( 'script' ) ).map( function ( script ) {
            script.parentNode.removeChild( script );
          } );

        else if ( typeof value === 'object' && !RUNTIME.helper.isNode( value ) )
          for ( var key in value )
            value[ key ] = RUNTIME.helper.protect( value[ key ] );

        return value;

      },

      regex: function ( index ) {

        switch ( index ) {
          case 'filename': return /^ccm\.([a-z][a-z0-9_]*)(-(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*))?(\.min)?(\.js)$/;
          case 'key':      return /^[a-zA-Z0-9_\-]+$/;
          case 'json':     return /^(({.*})|(\[.*])|true|false|null)$/;
        }

      },

      removeElement: function ( element ) {
        if ( element.parentNode ) element.parentNode.removeChild( element );
      },

      renameProperty: ( obj, before, after ) => {
        if ( obj[ before ] === undefined ) return delete obj[ before ];
        obj[ after ] = obj[ before ];
        delete obj[ before ];
      },

      replace: ( newnode, oldnode ) => {

        oldnode.parentNode && oldnode.parentNode.replaceChild( RUNTIME.helper.protect( newnode ), oldnode );

      },

      setContent: function ( element, content ) {

        content = RUNTIME.helper.protect( content );
        if ( typeof content === 'object' ) {
          element.innerHTML = '';
          if ( Array.isArray( content ) )
            content.map( function ( node ) { element.appendChild( node ); } );
          else
            element.appendChild( content );
        }
        else element.innerHTML = content;

      },

      show: function ( instance ) {
        instance.element.parentNode.removeChild( instance.element.parentNode.querySelector( '.ccm_loading' ) );
        instance.element.style.display = 'block';
      },

      shuffleArray: function ( array ) {
        for ( var i = array.length - 1; i > 0; i-- ) {
          var j = Math.floor( Math.random() * ( i + 1 ) );
          var temp = array[ i ];
          array[ i ] = array[ j ];
          array[ j ] = temp;
        }
        return array;
      },

      solveDependency: function ( obj, key, callback ) {

        if ( typeof key === 'function' ) { callback = key; key = undefined; }

        var action = RUNTIME.helper.clone( key === undefined ? obj : obj[ key ] );

        if ( !RUNTIME.helper.isDependency( action ) ) { if ( callback ) callback(); return; }

        action[ 0 ] = RUNTIME[ action[ 0 ].split( '.' ).pop() ];

        action.push( function ( result ) {
          if ( key !== undefined ) obj[ key ] = result;      // replace ccm dependency with the result of the solved dependency
          if ( callback ) callback( result );
        } );

        return RUNTIME.helper.action( action );

      },

      solveDotNotation: function ( obj ) {

        for ( const key in obj )
          if ( key.indexOf( '.' ) !== -1 ) {
            RUNTIME.helper.deepValue( obj, key, obj[ key ] );
            delete obj[ key ];
          }
        return obj;

      },

      toDotNotation: function ( obj ) {

        const result = {};
        recursive( obj, '' );
        return result;

        function recursive( obj, prefix ) {

          for ( const key in obj )
            if ( typeof obj[ key ] === 'object' )
              recursive( obj[ key ], prefix + key + '.' );
            else
              result[ prefix + key ] = obj[ key ];

        }

      },

      toJSON: function ( value ) {
        return JSON.parse( JSON.stringify( value ) );
      },

      transformStringArray: function ( arr ) {

        var obj = {};
        arr.map( function ( value ) { obj[ value ] = true } );
        return obj;

      },

      unescapeHTML: ( value ) => {

        const temp = document.createElement( 'div' );
        temp.innerHTML = value;
        if ( temp.childNodes.length === 0 ) return '';
        const result = temp.childNodes[0].nodeValue;
        temp.removeChild( temp.firstChild );
        return result;

      },

      wait: function ( time, callback ) {
        window.setTimeout( callback, time );
      }
    }

  };

  const Datastore = function () {

    const callbacks = [];
    const that = this;

    let my;

    this.init = callback => {

      my = RUNTIME.helper.privatize( that, 'local', 'store', 'url', 'db', 'method', 'datasets' );

      my.store && !my.url ? prepareDB( proceed ) : proceed();

      function prepareDB( callback ) {

        !db ? openDB( proceed ) : proceed();

        function openDB( callback ) {

          const request = indexedDB.open( 'ccm' );

          request.onsuccess = function () {

            db = this.result;

            callback();

          };

        }

        function proceed() {

          !db.objectStoreNames.contains( my.store ) ? updateDB( callback ) : callback();

          function updateDB( callback ) {

            let version = parseInt( localStorage.getItem( 'ccm' ) );

            if ( !version ) version = 1;

            db.close();

            const request = indexedDB.open( 'ccm', version + 1 );

            request.onupgradeneeded = () => {

              db = this.result;

              localStorage.setItem( 'ccm', db.version );

              db.createObjectStore( my.store, { keyPath: 'key' } );

            };

            request.onsuccess = callback;

          }

        }

      }

      function proceed() {

        my.url && my.url.indexOf( 'ws' ) === 0 ? prepareRealtime( callback ) : callback();

        function prepareRealtime( callback ) {

          let message = [ my.db, my.store ];
          if ( my.datasets )
            message = message.concat( my.datasets );

          my.socket = new WebSocket( my.url, 'ccm-cloud' );

          my.socket.onmessage = message => {

            message = JSON.parse( message.data );

            if ( message.callback ) callbacks[ message.callback - 1 ]( message.data );

            else {

              that.onchange && that.onchange( message.data );

            }

          };

          my.socket.onopen = function () { this.send( message ); callback(); };

        }
      }

    };

    this.source = () => RUNTIME.helper.filterProperties( my, 'url', 'db', 'store' );
    this.clear  = () => my.local = {};

    this.get = ( key_or_query={}, callback ) => {

      if ( typeof key_or_query === 'function' ) { callback = key_or_query; key_or_query = {}; }

      if ( RUNTIME.helper.isObject( key_or_query ) ) key_or_query = RUNTIME.helper.clone( key_or_query );

      else if ( !RUNTIME.helper.isKey( key_or_query ) && !( my.url && key_or_query === '{}' ) ) { RUNTIME.helper.log( 'This value is not a valid dataset key:', key_or_query ); return null; }

      my.url ? serverDB() : ( my.store ? clientDB() : localCache() );

      function localCache() {

        solveDependencies( RUNTIME.helper.isObject( key_or_query ) ? runQuery( key_or_query ) : RUNTIME.helper.clone( my.local[ key_or_query ] ), callback );

        function runQuery( query ) {

          const results = [];

          for ( const key in my.local ) RUNTIME.helper.isSubset( query, my.local[ key ] ) && results.push( RUNTIME.helper.clone( my.local[ key ] ) );

          return results;
        }

      }

      function clientDB() {

        getStore().get( key_or_query ).onsuccess = event => solveDependencies( event.target.result, callback );

      }

      function serverDB() {

        ( my.socket ? useWebsocket : useHttp )( prepareParams( { get: key_or_query } ), response => solveDependencies( response, callback ) );

      }

      function solveDependencies( value, callback ) {

        if ( !Array.isArray() && !RUNTIME.helper.isObject() ) return callback( value );

        let counter = 1;

        recursive( value );

        function recursive( arr_or_obj ) {

          for ( const i in arr_or_obj ) {
            const value = arr_or_obj[ i ];

            if ( Array.isArray( value && value.length > 0 && value[ 0 ] === 'ccm.get' ) ) solveDependency( value, arr_or_obj, i );

            else if ( Array.isArray( value ) || ( RUNTIME.helper.isObject( value ) && !RUNTIME.helper.isNode( value ) && !RUNTIME.helper.isInstance( value ) ) ) recursive( value );

          }

          check();

        }

        function solveDependency( dependency, arr_or_obj, i ) {

          counter++;

          RUNTIME.get( dependency[ 1 ], dependency[ 2 ], result => { arr_or_obj[ i ] = result; recursive( result ); check(); } );

        }

        function check() {

          !--counter && callback && callback( value );

        }

      }

    };

    this.set = ( priodata, callback ) => {

      priodata = RUNTIME.helper.clone( priodata );

      if ( !priodata.key ) priodata.key = RUNTIME.helper.generateKey();

      if ( !RUNTIME.helper.isKey( priodata.key ) ) return RUNTIME.helper.log( 'This value is not a valid dataset key:', priodata.key );

      my.url ? serverDB() : ( my.store ? clientDB() : localCache() );

      function localCache() {

        if ( my.local[ priodata.key ] ) RUNTIME.helper.integrate( priodata, my.local[ priodata.key ] );

        else my.local[ priodata.key ] = priodata;

        callback && callback();

      }

      function clientDB() {

        getStore().put( priodata ).onsuccess = event => callback && callback( !!event.target.result );

      }

      function serverDB() {

        ( my.socket ? useWebsocket : useHttp )( prepareParams( { set: priodata } ), response => RUNTIME.helper.isKey( response ) && callback && callback( response ) );

      }

    };

    this.del = ( key, callback ) => {

      if ( !RUNTIME.helper.isKey( key ) ) return RUNTIME.helper.log( 'This value is not a valid dataset key:', key );

      my.url ? serverDB() : ( my.store ? clientDB() : localCache() );

      function localCache() {

        delete my.local[ key ]; callback && callback( true );

      }

      function clientDB() {

        getStore().delete( key ).onsuccess = event => callback && callback( !!event.target.result );

      }

      function serverDB() {

        ( my.socket ? useWebsocket : useHttp )( prepareParams( { del: key } ), response => response === true && callback && callback( response ) );

      }

    };

    function getStore() {

      return db.transaction( [ my.store ], 'readwrite' ).objectStore( my.store );

    }

    function prepareParams( params={} ) {

      if ( my.db ) params.db = my.db;
      params.store = my.store;
      const user = RUNTIME.context.find( that, 'user' );
      if ( user && user.isLoggedIn() ) {
        params.realm = user.getRealm();
        params.token = user.data().token;
      }
      return params;

    }

    function useWebsocket( params, callback ) {

      callbacks.push( callback );
      params.callback = callbacks.length;
      my.socket.send( JSON.stringify( params ) );

    }

    function useHttp( params, callback ) {

      RUNTIME.load( { url: my.url, params: params, method: my.method }, callback );

    }

  };

  if ( RUNTIME.version && !ccm[ RUNTIME.version() ] ) ccm[ RUNTIME.version() ] = RUNTIME;

  if ( !ccm.version || RUNTIME.helper.compareVersions( RUNTIME.version(), ccm.version() ) > 0 ) { ccm.latest = RUNTIME; RUNTIME.helper.integrate( RUNTIME, ccm ); }

} )();
