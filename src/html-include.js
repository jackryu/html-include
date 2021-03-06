/*jslint browser: true, indent: 2, evil: true*/
/*global Event, DOMParser*/

(function (window) {
  'use strict';
  var proto;


  /**
   * Prevent the regular DOMContentLoaded event from bubbling,
   * and instead, manually emit a DOMContentLoaded event once
   * there are no more * html-include elements with a src attribute.
   */
  (function () {
    var CustomDOMContentLoaded = new Event('DOMContentLoaded'),
      CustomWindowLoad = new Event('load'),
      beforeLoad = new Event('beforeLoad'),
      windowEmitted = false,
      windowListener,
      listener;

    windowListener = function (e) {
      e.stopImmediatePropagation();
      windowEmitted = true;
    };
    listener = function (e) {
      e.stopImmediatePropagation();
      var inter = setInterval(function () {
        if (document.body.querySelectorAll('html-include[src]').length === 0) {
          clearInterval(inter);
          document.removeEventListener('DOMContentLoaded', listener, true);
          window.removeEventListener('load', windowListener, true);
          window.dispatchEvent(beforeLoad);
          document.dispatchEvent(CustomDOMContentLoaded);
          if (windowEmitted) {
            window.dispatchEvent(CustomWindowLoad);
          }
        }
      }, 1);
    };
    window.addEventListener('load', windowListener, true);
    document.addEventListener('DOMContentLoaded', listener, true);
  }());


  function xhr(that, uri) {
    var r = new XMLHttpRequest();

    if (that.preventCache || that.getAttribute('prevent-cache') !== null) {
      uri += (/\?/.test(uri) ? '&' : '?') + (new Date().getTime());
    }

    r.open("GET", uri, true);
    r.onreadystatechange = function () {
      var response, parser, doc;
      if (r.readyState !== 4) {
        return;
      }
      response = r.responseText || '';

      // It is already attached?
      if (that.parentNode !== null) {
        that.outerHTML = response;
      } else {
        //It is not, save the content.
        that.content = response;
      }

      parser = new DOMParser();
      doc = parser.parseFromString(response, "text/xml");
      Array.prototype.forEach.call(doc.querySelectorAll('script'), function (script) {
        var src = script.getAttribute('src'), ele;
        window.addEventListener('beforeLoad', function () {
          if (src) {
            ele = document.createElement('script');
            ele.setAttribute('src', src);
            document.querySelector('head').appendChild(ele);
          }
          if (!src) {
            eval.call(null, script.innerHTML);
          }
        });
      });
    };
    r.send();
  }

  proto = Object.create(window.HTMLElement.prototype);

  /*jslint unparam:true*/
  proto.attributeChangedCallback = function (attr, oldVal, newVal) {
    if (attr === 'src') {
      this.src = newVal;
    }
  };
  /*jslint unparam:false*/

  proto.attachedCallback = function () {
    // If it already has content, just replace it.
    if (this.content) {
      this.outerHTML = this.content;
    }
  };

  proto.createdCallback = function () {
    var that = this, src;
    src = this.src || this.getAttribute('src') || false;

    if (src) {
      xhr(this, src);
      return;
    }
    Object.defineProperty(this, 'src', {
      set : function (val) {
        xhr(that, val);
      },
      get : function () {
        return that.getAttribute('src') || '';
      }
    });
  };
  document.registerElement('html-include', {
    prototype : proto
  });
}(this));
