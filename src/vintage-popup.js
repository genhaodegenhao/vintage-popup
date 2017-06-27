/**
 * Popup
 * ------------
 * Version : 0.1.71
 * Website : vintage-web-production.github.io/vintage-popup
 * Repo    : github.com/Vintage-web-production/vintage-popup
 * Author  : Shapovalov Vitali
 */

;(function () {

  /**
   * Current Popup module version.
   *
   * @constant
   * @type {String}
   */
  var VERSION = '0.1.71';

  /**
   * Detect iOS device.
   *
   * @private
   * @const
   * @type {Boolean}
   */
  var IS_IOS = /iPad|iPhone|iPod/.test(navigator.platform);

  /**
   * DOM elements.
   *
   * @private
   * @type {jQuery}
   */
  var $window, $document, $body, $htmlBody;

  /**
   * Popup flags.
   *
   * @private
   * @type {boolean}
   */
  var closeOnResizeFlag = false, closeOnEscFlag = false;


  /**
   * Popup module.
   *
   * @param {jQuery} $button
   * @param {Object} [options]
   *
   * @param {String} [options.openedClass='opened'] - Class added to the popup when it's open.
   * @param {String} [options.openedBodyClass='popup-opened'] - Class added to the body when popup is open.
   * @param {String} [options.closeBtnSelector='.popup__close'] - Popup's close button selector.
   * @param {String} [options.targetPopupId='data-popup-target'] - Target popup (its data-popup-id value).
   *
   * @param {String} [options.eventsNameSpace='popup'] - jQuery events namespace.
   * @param {Boolean} [options.closeOnBgClick=true] - If true, closes the popup by clicking anywhere outside it.
   * @param {Boolean} [options.closeOnEsc=true] - If true, closes the popup after pressing the ESC key.
   * @param {Boolean} [options.closeOnResize=false] - If true, closes the popup on window resize.
   * @param {Boolean} [options.openOnClick=true] - If true, opens popup on click.
   * @param {Boolean} [options.lockScreen=true] - If true, add padding right according to the width of the scrollbar.
   *
   * @param {Function} [options.beforeOpen]
   * @param {Function} [options.afterOpen]
   * @param {Function} [options.beforeClose]
   * @param {Function} [options.afterClose]
   *
   * @param {Object|Boolean} [options.remote=false] - AJAX options
   * @param {String} [options.remote.url]
   * @param {Function} [options.remote.onBeforeSend]
   * @param {Function} [options.remote.onError]
   * @param {Function} [options.remote.onComplete]
   * @param {*} [options.remote.data]
   *
   * @return {Popup}
   */
  function Popup ($button, options) {

    // support instantiation without the `new` keyword
    if (typeof this === 'undefined' || Object.getPrototypeOf(this) !== Popup.prototype) {
      return new Popup($button, options)
    }

    // update helpers (with fixed jQuery version)
    $window   = $(window);
    $document = $(document);
    $body     = $('body');
    $htmlBody = $('html, body');

    // defaults extended with provided options
    this.options = options = $.extend(true, {
      openedClass      : 'opened',
      openedBodyClass  : 'popup-opened',
      closeBtnSelector : '.popup__close',
      targetPopupId    : $button.data('popup-target'),
      eventsNameSpace  : 'popup',
      lockScreen       : true,
      closeOnBgClick   : true,
      closeOnEsc       : true,
      closeOnResize    : false,
      openOnClick      : true,
      beforeOpen       : null,
      afterOpen        : null,
      beforeClose      : null,
      afterClose       : null,
      remote           : { url: $button.data('popup-remote') },
    }, options);

    // DOM elements
    this.$button = $button;
    this.$popup = $('[data-popup-id="' + options.targetPopupId + '"]');

    // default events with namespaces
    this.defaultEvents = 'click.' + options.eventsNameSpace + ' tap.' + options.eventsNameSpace;

    // activate popup
    this.activate();

    // return popup instance (give access to instance methods)
    return this;
  }

  /**
   * Show popup version.
   *
   * @type {String}
   */
  Popup.version = VERSION;

  /**
   * Returns scrollbar width.
   *
   * @return {number}
   */
  Popup.getScrollbarWidth = function () {
    // no scrollbar found (width = 0)
    if ($document.height() <= $window.height()) return 0;

    var outer = document.createElement('div');
    var inner = document.createElement('div');
    var widthNoScroll;
    var widthWithScroll;

    outer.style.visibility = 'hidden';
    outer.style.width = '100px';
    document.body.appendChild(outer);

    widthNoScroll = outer.offsetWidth;

    // force scrollbars
    outer.style.overflow = 'scroll';

    // add inner div
    inner.style.width = '100%';
    outer.appendChild(inner);

    widthWithScroll = inner.offsetWidth;

    // remove divs
    outer.parentNode.removeChild(outer);

    return widthNoScroll - widthWithScroll;
  };

  /**
   * Locks the screen width (replace scrollbar with appropriate padding).
   */
  Popup.lockScreen = function () {
    // do nothing when iOs detected
    if (IS_IOS) return;

    var $body = $(document.body);
    var paddingRight =
      parseInt($body.css('padding-right'), 10) + Popup.getScrollbarWidth();

    $body.css('padding-right', paddingRight + 'px');
  };

  /**
   * Unlocks the screen (bring scrollbar back).
   */
  Popup.unlockScreen = function () {
    // do nothing when iOs detected
    if (IS_IOS) return;

    var $body = $(document.body);
    var paddingRight =
      parseInt($body.css('padding-right'), 10) - Popup.getScrollbarWidth();

    $body.css('padding-right', paddingRight + 'px');
  };

  /**
   * Find and close all opened popups.
   *
   * @returns {Popup}
   */
  Popup.prototype.checkAndCloseAllPopups = function () {
    var $popups = $body.find('[data-popup-id]');
    var $openedPopup = $popups.filter('.' + this.options.openedClass);

    if ($openedPopup.length) {
      var $openedPopupInstance = $openedPopup.data('popup');

      this.prevPopupScrollTop = $openedPopupInstance.scrollTop;
      $openedPopupInstance.close(true);
    }

    return this;
  };

  /**
   * Check existence and run callback.
   *
   * @param {*} callback
   * @returns {Popup}
   */
  Popup.prototype.checkAndRunCallback = function (callback) {
    if (typeof callback === 'function') {
      callback.call(null, this);
    } else if (callback != undefined) {
      console.warn('Callback should be a function.')
    }

    return this;
  };

  /**
   * Open popup.
   *
   * @param {Object} remoteData - ajax request 'response' object
   * @returns {Popup}
   */
  Popup.prototype.open = function (remoteData) {

    // do stuff with remote data before popup open
    if (remoteData) {
      // actions with response
      this.actionsWithRemoteData(remoteData);

      // register 'close' button event
      this.registerCloseBtnClick();
    }

    // before open callback
    this.checkAndRunCallback(this.options.beforeOpen);

    // save scroll top cords
    this.scrollTop = this.prevPopupScrollTop || $window.scrollTop();

    // save scrollTop to data set
    this.$popup.data('popupScrollTop', this.scrollTop);

    // lock the screen
    if (this.options.lockScreen) Popup.lockScreen();

    // add active class to body
    $body
      .css('top', -this.scrollTop)
      .addClass(this.options.openedBodyClass);

    // add active class to popup
    this.$popup.addClass(this.options.openedClass);

    // after open callback
    this.checkAndRunCallback(this.options.afterOpen);

    return this;
  };

  /**
   * Close popup.
   *
   * @param {Boolean} hasOpenedPopups - close popup without changing body styles
   * @returns {Popup}
   */
  Popup.prototype.close = function (hasOpenedPopups) {
    // before close callback
    this.checkAndRunCallback(this.options.beforeClose);

    // remove active class from body
    if (!hasOpenedPopups) {

      // unlock the screen
      if (this.options.lockScreen) Popup.unlockScreen();

      $body
        .css({ top: '' })
        .removeClass(this.options.openedBodyClass);

      $htmlBody
        .scrollTop(this.$popup.data('popupScrollTop'));

      this.prevScrollTop ? this.prevScrollTop = false : null;
    }

    // remove active class from popup
    this.$popup.removeClass(this.options.openedClass);

    // after close callback
    this.checkAndRunCallback(this.options.afterClose);

    return this;
  };

  /**
   * Actions with remote data.
   *
   * @param {Object} remoteData
   * @returns {Popup}
   */
  Popup.prototype.actionsWithRemoteData = function (remoteData) {
    if (remoteData.replaces instanceof Array) {
      for (var i = 0, ilen = remoteData.replaces.length; i < ilen; i++) {
        $(remoteData.replaces[i].what).replaceWith(remoteData.replaces[i].data);
      }
    }
    if (remoteData.append instanceof Array) {
      for (i = 0, ilen = remoteData.append.length; i < ilen; i++) {
        $(remoteData.append[i].what).append(remoteData.append[i].data);
      }
    }
    if (remoteData.content instanceof Array) {
      for (i = 0, ilen = remoteData.content.length; i < ilen; i++) {
        $(remoteData.content[i].what).html(remoteData.content[i].data);
      }
    }
    if (remoteData.js) {
      $body.append(remoteData.js);
    }
    if (remoteData.refresh) {
      window.location.reload(true);
    }
    if (remoteData.redirect) {
      window.location.href = remoteData.redirect;
    }
  };

  /**
   * Open popup on button's click.
   *
   * @returns {Popup}
   */
  Popup.prototype.registerOpenOnClick = function () {
    var _this = this;

    this.$button.unbind(this.defaultEvents).on(this.defaultEvents, function () {
      // find opened popups and close them
      _this.checkAndCloseAllPopups();

      // remote data
      if (_this.options.remote.url) {
        var remote = _this.options.remote;

        $.ajax({
          url: remote.url,
          method: 'get',
          cache: 'false',
          dataType: 'json',
          data: remote.data,
          beforeSend: remote.onBeforeSend,
          success: function (response) {
            _this.open(response);
          },
          complete: remote.onComplete,
          error: remote.onError
        });

        return this;
      }

      // open popup
      _this.open(false);
    });

    return this;
  };

  /**
   * Close popup on window's resize.
   *
   * @returns {Popup}
   */
  Popup.prototype.registerCloseOnResize = function () {
    var _this = this;
    var events = 'resize.' + this.options.eventsNameSpace;

    if (!closeOnResizeFlag) {
      $window.on(events, function () {
        if ($body.hasClass(_this.options.openedBodyClass)) {
          Popup.closeAllPopups(_this.options.openedClass);
        }
      });

      closeOnResizeFlag = true;
    }

    return this;
  };

  /**
   * Close popup on esc button click.
   *
   * @returns {Popup}
   */
  Popup.prototype.registerCloseOnEsc = function () {
    var _this = this;
    var events = 'keyup.' + this.options.eventsNameSpace;

    if (!closeOnEscFlag) {
      $document.on(events, function (event) {
        if (event.keyCode == 27 && $body.hasClass(_this.options.openedBodyClass)) {
          Popup.closeAllPopups(_this.options.openedClass);
        }
      });

      closeOnEscFlag = true;
    }

    return this;
  };

  /**
   * Close popup on modal's background click.
   *
   * @returns {Popup}
   */
  Popup.prototype.registerCloseOnBgClick = function () {
    var _this = this;

    _this.$popup.on(this.defaultEvents, function (event) {
      if (event.target === _this.$popup.get(0)) _this.close();
    });

    return this;
  };

  /**
   * Close popup on close button click.
   *
   * @returns {Popup}
   */
  Popup.prototype.registerCloseBtnClick = function () {
    var _this = this;
    var $closeButton = _this.$popup.find(this.options.closeBtnSelector);

    if (!$closeButton.unbind || !$closeButton.on) {
      console.warn('Close button was not found');

      return this;
    }

    $closeButton.unbind(this.defaultEvents).on(this.defaultEvents, function () {
      _this.close();
    });

    return this;
  };

  /**
   * Register all events.
   *
   * @returns {Popup}
   */
  Popup.prototype.activate = function () {

    // if popup was already activated
    if (this.$popup.data('popup')) {
      this.$popup.data('popup', this);

      if (this.options.openOnClick) this.registerOpenOnClick();

      return this;
    }

    // 'close' button
    this.registerCloseBtnClick();

    // save Popup instance data
    this.$popup.data('popup', this);

    // close popup on 'Esc' click
    if (this.options.closeOnEsc) this.registerCloseOnEsc();

    // close popup when clicked anywhere on the black background
    if (this.options.closeOnBgClick) this.registerCloseOnBgClick();

    // close popup when the size of the browser window changes
    if (this.options.closeOnResize) this.registerCloseOnResize();

    // open popup on click (button)
    if (this.options.openOnClick) this.registerOpenOnClick();

    return this;
  };

  /**
   * Removes event listener from button and destroys associated data.
   */
  Popup.prototype.kill = function () {
    this.$button.unbind(this.defaultEvents);
    this.$popup.data('popup', null);
  };

  /**
   * Kill specified popup.
   *
   * @static
   * @param {String|jQuery} popup
   */
  Popup.kill = function (popup) {
    var popupInstance = $(popup).data('popup');

    popupInstance.kill();
  };

  /**
   * Close all popups.
   *
   * @static
   * @param {String} [openedClass='opened'] - css class-indicator
   */
  Popup.closeAllPopups = function (openedClass) {
    openedClass = openedClass || 'opened';
    var $popups = $body.find('[data-popup-id]');
    var $openedPopup = $popups.filter('.' + openedClass);

    if ($openedPopup.length) {
      var $openedPopupInstance = $openedPopup.data('popup');

      $openedPopupInstance.close.call($openedPopupInstance, false);
    }
  };

  /**
   * Expose popup module as jquery plugin.
   * (jquery-webpack conflict fix)
   *
   * @static
   * @param {jQuery} jQuery
   */
  var exposePopup = Popup.expose = function (newJquery) {
    // refresh jquery itself
    $ = newJquery;

    // refresh jquery plugin
    $.fn.popup = function (options) {
      var instances = [];

      this.each(function () {
        var $this = $(this);
        instances.push(new Popup($this, options));
      });

      return instances.length === 1 ? instances[0] : instances;
    };
  };

  /**
   * Expose Popup module.
   */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    // CommonJS, just export
    module.exports = Popup;
  } else if (typeof define === 'function' && define.amd) {
    // AMD support
    define('vintage-popup', function () { return Popup; });
  } else {
    // Global
    window.Popup = Popup;
  }

  /**
   * Expose Popup module.
   */
  exposePopup($);
})();
