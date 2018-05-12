/**
 * @overview CCM Component for editing text with others in realtime
 * using orbitdb.
 * @author Max Kerp <max.kerp@smail.inf.h-brs.de> 2018
 * @license The MIT License (MIT)
 * @date 12.05.18
 */

( function () {

  var component = {

    name: 'collab',

    ccm: 'https://ccmjs.github.io/ccm/ccm.js',

    config: {

      "dstore": "CCM.collab"
    },

    Instance: function () {

      var self = this;
      var my;           // contains privatized instance members

      this.init = function ( callback ) {

      };

      this.ready = function ( callback ) {


      };

      this.start = function ( callback ) {

        // has logger instance? => log 'render' event
        if ( self.logger ) self.logger.log( 'render' );

        start();

        if ( callback ) callback(self);
    }

  };

  function p(){window.ccm[v].component(component)}var f="ccm."+component.name+(component.version?"-"+component.version.join("."):"")+".js";if(window.ccm&&null===window.ccm.files[f])window.ccm.files[f]=component;else{var n=window.ccm&&window.ccm.components[component.name];n&&n.ccm&&(component.ccm=n.ccm),"string"==typeof component.ccm&&(component.ccm={url:component.ccm});var v=component.ccm.url.split("/").pop().split("-");if(v.length>1?(v=v[1].split("."),v.pop(),"min"===v[v.length-1]&&v.pop(),v=v.join(".")):v="latest",window.ccm&&window.ccm[v])p();else{var e=document.createElement("script");document.head.appendChild(e),component.ccm.integrity&&e.setAttribute("integrity",component.ccm.integrity),component.ccm.crossorigin&&e.setAttribute("crossorigin",component.ccm.crossorigin),e.onload=function(){p(),document.head.removeChild(e)},e.src=component.ccm.url}}
}() );
