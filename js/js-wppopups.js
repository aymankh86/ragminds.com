"use strict";

;
/* global wppopups_settings,*/

(function ($) {
  /**
   * Copyright 2012, Digital Fusion
   * Licensed under the MIT license.
   * http://teamdf.com/jquery-plugins/license/
   *
   * @author Sam Sehnert
   * @desc A small plugin that checks whether elements are within
   *       the user visible viewport of a web browser.
   *       can accounts for vertical position, horizontal, or both
   */
  var $w = $(window);

  $.fn.visible = function (partial, hidden, direction, container) {
    if (this.length < 1) return; // Set direction default to 'both'.

    direction = direction || 'both';
    var $t = this.length > 1 ? this.eq(0) : this,
        isContained = typeof container !== 'undefined' && container !== null,
        $c = isContained ? $(container) : $w,
        wPosition = isContained ? $c.position() : 0,
        t = $t.get(0),
        vpWidth = $c.outerWidth(),
        vpHeight = $c.outerHeight(),
        clientSize = hidden === true ? t.offsetWidth * t.offsetHeight : true;

    if (typeof t.getBoundingClientRect === 'function') {
      // Use this native browser method, if available.
      var rec = t.getBoundingClientRect(),
          tViz = isContained ? rec.top - wPosition.top >= 0 && rec.top < vpHeight + wPosition.top : rec.top >= 0 && rec.top < vpHeight,
          bViz = isContained ? rec.bottom - wPosition.top > 0 && rec.bottom <= vpHeight + wPosition.top : rec.bottom > 0 && rec.bottom <= vpHeight,
          lViz = isContained ? rec.left - wPosition.left >= 0 && rec.left < vpWidth + wPosition.left : rec.left >= 0 && rec.left < vpWidth,
          rViz = isContained ? rec.right - wPosition.left > 0 && rec.right < vpWidth + wPosition.left : rec.right > 0 && rec.right <= vpWidth,
          vVisible = partial ? tViz || bViz : tViz && bViz,
          hVisible = partial ? lViz || rViz : lViz && rViz,
          vVisible = rec.top < 0 && rec.bottom > vpHeight ? true : vVisible,
          hVisible = rec.left < 0 && rec.right > vpWidth ? true : hVisible;
      if (direction === 'both') return clientSize && vVisible && hVisible;else if (direction === 'vertical') return clientSize && vVisible;else if (direction === 'horizontal') return clientSize && hVisible;
    } else {
      var viewTop = isContained ? 0 : wPosition,
          viewBottom = viewTop + vpHeight,
          viewLeft = $c.scrollLeft(),
          viewRight = viewLeft + vpWidth,
          position = $t.position(),
          _top = position.top,
          _bottom = _top + $t.height(),
          _left = position.left,
          _right = _left + $t.width(),
          compareTop = partial === true ? _bottom : _top,
          compareBottom = partial === true ? _top : _bottom,
          compareLeft = partial === true ? _right : _left,
          compareRight = partial === true ? _left : _right;

      if (direction === 'both') return !!clientSize && compareBottom <= viewBottom && compareTop >= viewTop && compareRight <= viewRight && compareLeft >= viewLeft;else if (direction === 'vertical') return !!clientSize && compareBottom <= viewBottom && compareTop >= viewTop;else if (direction === 'horizontal') return !!clientSize && compareRight <= viewRight && compareLeft >= viewLeft;
    }
  };
})(jQuery);

(function ($) {
  'use strict';

  var WPPopupsPro = {
    popups: {},
    last_position: null,
    delta: 0,
    timer: null,

    /**
     * Start the engine.
     *
     * @since 2.0.0
     */
    init: function init() {
      // Document ready
      $(document).ready(WPPopupsPro.ready); // Page load

      $(window).on('load', WPPopupsPro.load); // Document ready

      $(document).on('wppopupsReady', WPPopupsPro.start); // Before rules in src

      $(document).on('wppopupsBeforeReady', WPPopupsPro.beforeReady); // register events and hooks

      WPPopupsPro.bindEvents();
    },

    /**
     * Document ready.
     *
     * @since 2.0.0
     */
    ready: function ready() {},

    /**
     * Page load.
     *
     * @since 2.0.0
     */
    load: function load() {},
    start: function start() {
      WPPopupsPro.loopPopups(); // Set user identifier
      // WPPopupsPro.setUserIndentifier(); not needed for now

      $(document).trigger('wppopupsProStarted');
    },

    /**
     * Configure each popup
     */
    loopPopups: function loopPopups() {
      $(".spu-box").each(function () {
        var $popup = $(this),
            $id = $popup.data('id'); // check if popups goes after content

        WPPopupsPro.afterContentPopups($popup); // check advanced method

        WPPopupsPro.advancedClosePopups($popup);
        WPPopupsPro.pushContentPopups($popup);
      });
    },
    // --------------------------------------------------------------------//
    // Binds
    // --------------------------------------------------------------------//

    /**
     * Events bindings.
     *
     * @since 2.0.0
     */
    bindEvents: function bindEvents() {
      // Stats
      if (wppopups_pro_vars.enable_stats && '1' == wppopups_pro_vars.enable_stats) {
        $(document).on('wppopups.popup_converted', WPPopupsPro.trackConversion);
        $(document).on('wppopups.popup_opened', WPPopupsPro.trackOpening);
      } //disable scroll


      window.wp.hooks.addAction('wppopups_before_show_popup', 'wppopups', WPPopupsPro.disablePageScroll);
      window.wp.hooks.addAction('wppopups_hide_popup', 'wppopups', WPPopupsPro.enablePageScroll); // animations

      window.wp.hooks.addAction('wppopups_show_popup', 'wppopups', WPPopupsPro.triggerShowAnimations);
      window.wp.hooks.addAction('wppopups_show_popup', 'wppopups', WPPopupsPro.triggerAutoClose); // sticky

      window.wp.hooks.addAction('wppopups_show_popup', 'wppopups', WPPopupsPro.stickyPopup);
      window.wp.hooks.addFilter('wppopups_cancel_hide', 'wppopups', function (default_value, popup) {
        var settings = window.wppopups.settings(popup, 'position');

        if (settings.position == 'sticky-left' || settings.position == 'sticky-right') {
          return true;
        }

        return default_value;
      });
      $(document).on('click', '.spu-box .spu-sticky-title, .spu-position-sticky-right .spu-close-popup, .spu-position-sticky-left .spu-close-popup', function (e) {
        $(this).closest('.spu-box').toggleClass('spu-sticky-open');
      }); // Triggers

      window.wp.hooks.addAction('wppopups_trigger_popup', 'wppopups', WPPopupsPro.bindTriggers);
    },

    /**
     * Bind popup open trigger
     * @param func_name
     * @param trigger_value
     * @param $popup
     */
    bindTriggers: function bindTriggers(func_name, trigger_value, $popup) {
      if (typeof WPPopupsPro[func_name] == 'function') {
        WPPopupsPro[func_name](trigger_value, $popup);
      }
    },

    /**
     * Trigger exit intent
     * @param value
     * @param $popup
     */
    triggerByExit: function triggerByExit(value, $popup) {
      if (window.wppopups.isMobile()) {
        $(document).on('scroll', {
          value: value,
          popup: $popup
        }, WPPopupsPro.exitIntentMobile);
      } else {
        $(document.body).on('mouseleave', {
          value: value,
          popup: $popup
        }, WPPopupsPro.exitIntent);
      }
    },

    /**
     * TRigger popup when element of class become visible
     * @param value
     * @param $popup
     */
    triggerByVisible: function triggerByVisible(value, $popup) {
      // if not class provided abort
      if (value === '') {
        return;
      }

      $(window).bind('scroll', {
        value: value,
        popup: $popup
      }, WPPopupsPro.triggerVisible);
    },

    /**
     * @param value
     * @param $popup
     */
    triggerVisible: function triggerVisible(e) {
      var triggerClass = WPPopupsPro.cleanClass(e.data.value); // show box when criteria for this box is matched

      if ($(triggerClass).visible(true) && window.wppopups.checkConvertion(e.data.popup)) {
        // remove listen event if box shouldn't be hidden again
        $(window).unbind('scroll', WPPopupsPro.triggerVisible);
        window.wppopups.showPopup(e.data.popup);
      }
    },

    /**
     * Function that check a classname and add . in front
     * @param classname
     */
    cleanClass: function cleanClass(classname) {
      if (classname.indexOf('.') !== 0) {
        return '.' + classname;
      }

      return classname;
    },

    /**
     * Callback for exit intent popup
     * @param e
     * @param $popup
     */
    exitIntent: function exitIntent(e) {
      // Only trigger if leaving near the top of the page
      if (e.clientY > 20 || !window.wppopups.checkConvertion(e.data.popup)) {
        return;
      }

      window.wppopups.showPopup(e.data.popup); // we want to show it only once

      $(document.body).unbind('mouseleave', WPPopupsPro.exitIntent);
    },

    /**
     * Callback for exit intent popup for Mobile
     * @param e
     * @param $popup
     */
    exitIntentMobile: function exitIntentMobile(e) {
      if (!window.wppopups.checkConvertion(e.data.popup)) return;
      WPPopupsPro.scrollSpeed();
      if (WPPopupsPro.delta < -200) window.wppopups.showPopup(e.data.popup);
    },

    /**
     * Callback for calculate the speed scroll
     */
    scrollSpeed: function scrollSpeed() {
      var new_position = window.scrollY;
      if (WPPopupsPro.last_position != null) WPPopupsPro.delta = new_position - WPPopupsPro.last_position;
      WPPopupsPro.last_position = new_position;
      clearTimeout(WPPopupsPro.timer);
      WPPopupsPro.timer = setTimeout(function () {
        WPPopupsPro.last_position = null;
        WPPopupsPro.delta = 0;
      }, 50);
    },

    /**
     * Set cookie container user UUID.
     *
     */
    setUserIndentifier: function setUserIndentifier() {
      if (wppopups_settings.uuid_cookie && !WPPopupsPro.getCookie('_wpfuuid')) {
        // Generate UUID - http://stackoverflow.com/a/873856/1489528
        var s = new Array(36),
            hexDigits = '0123456789abcdef',
            uuid;

        for (var i = 0; i < 36; i++) {
          s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }

        s[14] = "4";
        s[19] = hexDigits.substr(s[19] & 0x3 | 0x8, 1);
        s[8] = s[13] = s[18] = s[23] = '-';
        uuid = s.join("");
        WPPopupsPro.createCookie('_wpfuuid', uuid, 3999);
      }
    },

    /**
     * Track popup opening
     * @param event
     * @param id
     */
    trackOpening: function trackOpening(event, id) {
      var $popup = window.wppopups.getPopup(id),
          settings = window.wppopups.settings($popup, 'settings'),
          sampling_active = wppopups_vars.dsampling || false,
          sampling_rate = wppopups_vars.dsamplingrate;
      var do_request = true; // don't track admins or test mode

      if (wppopups_vars.is_admin && settings.test_mode == '1') {
        return;
      } // only save when sampling is not active or lottery wins


      if (sampling_active && sampling_rate > 0) {
        var num = Math.floor(Math.random() * sampling_rate) + 1;
        do_request = 1 === num;
      }

      if (do_request) {
        // Make the ajax request to track the data. If using Google Analytics, send to GA, otherwise track locally.
        WPPopupsPro.trackGoogleAnalytics(id, false);
        var data = {
          action: 'track_wppopups',
          popup_id: id,
          conversion: false,
          post_id: wppopups_pro_vars.post_id
        };
        var ajax = {
          url: wppopups_vars.ajax_url,
          data: data,
          cache: false,
          type: 'POST',
          dataType: 'json',
          timeout: 30000
        };
        $.ajax(ajax);
      }
    },

    /**
     * Track in GA
     * @param popup_id
     * @param conversion
     */
    trackGoogleAnalytics: function trackGoogleAnalytics(popup_id, conversion) {
      var $popup = window.wppopups.getPopup(popup_id),
          settings = window.wppopups.settings($popup, 'settings'),
          eventCategory = settings.ga_event_category || 'Popup Event',
          ga_id = wppopups_pro_vars.ua_code,
          eventLabel = settings.ga_event_label || 'wppopups-' + popup_id,
          eventIAction = settings.ga_event_action_impression || 'impression',
          eventCAction = settings.ga_event_action_conversion || 'conversion',
          eventAction = conversion ? eventCAction : eventIAction;

      if (!ga_id) {
        return;
      } // Create a custom event tracker and dimensions if it has not been initialized.


      if (!WPPopupsPro.ga_init) {
        if (typeof ga == 'function') {
          // create tracker
          ga('create', ga_id, 'auto', {
            'name': 'WPPopupsTracker'
          });
        } //yoast analytics


        if (typeof __gaTracker == 'function') {
          //create tracker
          __gaTracker('create', ga_id, 'auto', {
            'name': 'WPPopupsTracker'
          });
        }

        WPPopupsPro.ga_init = true;
      }

      if (typeof ga == 'function') {
        // Send the event tracking data to Google Analytics.
        ga('WPPopupsTracker.send', 'event', eventCategory, eventAction, eventLabel);
      } //yoast analytics


      if (typeof __gaTracker == 'function') {
        // Send the event tracking data to Google Analytics.
        __gaTracker('WPPopupsTracker.send', 'event', eventCategory, eventAction, eventLabel);
      }
    },

    /**
     * Track popup conversion
     * @param event
     * @param id
     */
    trackConversion: function trackConversion(event, id) {
      var $popup = window.wppopups.getPopup(id),
          settings = window.wppopups.settings($popup, 'settings');
      var do_request = true; // don't track admins or test mode

      if (wppopups_vars.is_admin && settings.test_mode == '1') {
        return;
      } // Make the ajax request to track the data. If using Google Analytics, send to GA, otherwise track locally.


      WPPopupsPro.trackGoogleAnalytics(id, true);
      var data = {
        action: 'track_wppopups',
        popup_id: id,
        conversion: true,
        post_id: wppopups_pro_vars.post_id
      };
      var ajax = {
        url: wppopups_vars.ajax_url,
        data: data,
        cache: false,
        type: 'POST',
        dataType: 'json',
        timeout: 30000
      };
      $.ajax(ajax);
    },

    /**
     * Run before the popup rules are checked
     */
    beforeReady: function beforeReady() {
      var counter = WPPopupsPro.sessionCounter();
      window.wp.hooks.addFilter('wppopups_pre_ready_data', 'wppopups', function (data) {
        data.visited_n_pages = counter;
        return data;
      }); // check if any popups has trigger by conversion

      $(".spu-box").each(function () {
        var $popup = $(this),
            $rules = window.wppopups.settings($popup, 'rules');

        if (Object.keys($rules).length) {
          for (var group in $rules) {
            for (var rule in $rules[group]) {
              if ($rules[group][rule].rule == 'converted') {
                // add need-convert class
                $popup.addClass($rules[group][rule].operator == '==' ? 'yes-convert' : 'no-convert');
                $popup.data('convert-id', $rules[group][rule].value);
              } // check if there is no need for ajax and we have a rule for n visited pages


              if ($rules[group][rule].rule == 'visited_n_pages' && !$popup.data('need_ajax')) {
                var operator = $rules[group][rule].operator;
                var show_popup = false;

                if (operator == "==") {
                  show_popup = counter == $rules[group][rule].value;
                } else if (operator == "!=") {
                  show_popup = !(counter == $rules[group][rule].value);
                }

                if (counter < $rules[group][rule].value && operator == "<") {
                  show_popup = true;
                }

                if (counter > $rules[group][rule].value && operator == ">") {
                  show_popup = true;
                }

                if (!show_popup) {
                  $popup.remove();
                }
              }
            }
          }
        }
      });
    },

    /**
     * Auto close trigger method
     * @param $popup
     */
    triggerAutoClose: function triggerAutoClose($popup) {
      var settings = window.wppopups.settings($popup, 'settings'); // Seconds left to close ( autoclose timer )

      if (settings.autoclose > 0 && typeof $popup.counter === 'undefined') {
        $popup.autoclose = settings.autoclose;
        $popup.counter = setInterval(function () {
          WPPopupsPro.autoClose($popup);
        }, 1000);
      }
    },

    /**
     * Auto close function
     * @param $popup
     */
    autoClose: function autoClose($popup) {
      var settings = window.wppopups.settings($popup, 'settings');
      $popup.autoclose = $popup.autoclose - 1;

      if ($popup.autoclose <= 0) {
        clearInterval($popup.counter);
        $popup.counter = 'undefined';
        $popup.autoclose = settings.autoclose;
        window.wppopups.hidePopup($popup, false);
        return;
      }

      $("#spu-" + $popup.data('id')).find('.spu-timer').html(wppopups_pro_vars.l18n.wait + " " + $popup.autoclose + " " + wppopups_pro_vars.l18n.seconds);
    },

    /**
     * Move popup after post content
     * @param $popup
     */
    afterContentPopups: function afterContentPopups($popup) {
      var settings = window.wppopups.settings($popup, 'position');

      if (settings.position == 'after-post') {
        $('#spu-bg-' + $popup.data('id')).remove();

        if ($('.spu-placeholder').length) {
          $('.spu-placeholder').replaceWith($popup);
        } else {
          $popup.remove();
        } // remove advanced close for this popup


        WPPopupsPro.advancedClosePopups($popup, true);
      }
    },

    /**
     * Disable advanced close method
     * @param $popup
     * @param force boolean
     */
    advancedClosePopups: function advancedClosePopups($popup, force) {
      var settings = window.wppopups.settings($popup, 'settings'); // if popup has disabled advanced close or we are forcing ir (after content

      if (settings.advanced_close == '1' || force) {
        window.wp.hooks.addFilter('wppopups_allow_togglePopups', 'wppopups', function (default_value, popup) {
          // if event fired popup id is equal to our popup, cancel it
          if (popup.data('id') == $popup.data('id')) {
            return false;
          }

          return default_value;
        });
      }
    },

    /**
     * Disabel page scroll if needed
     * @param $popup
     */
    disablePageScroll: function disablePageScroll($popup) {
      var settings = window.wppopups.settings($popup, 'settings');

      if (settings.disable_scroll && settings.disable_scroll == '1') {
        $('body,html').css('overflow', 'hidden');
      }
    },

    /**
     * Disabel page scroll if needed
     * @param $popup
     */
    enablePageScroll: function enablePageScroll($popup) {
      var settings = window.wppopups.settings($popup, 'settings');

      if (settings.disable_scroll && settings.disable_scroll == '1') {
        $('body,html').css('overflow', '');
      }
    },

    /**
     * Trigger premium animations on the popup
     * @param $popup
     */
    triggerShowAnimations: function triggerShowAnimations($popup) {
      var animation = window.wppopups.settings($popup, 'animation');
      var $class_name = '';

      switch (animation.animation) {
        case 'fade':
          break;

        case 'slide':
          break;

        case 'disable':
          break;

        default:
          $class_name = 'spu-animation-' + animation.animation;
          break;
      }

      if ($class_name !== '') {
        $popup.addClass($class_name).addClass('spu-animation-animated');
      }
    },

    /**
     * Show a sticky popup
     * @param $popup
     */
    stickyPopup: function stickyPopup($popup) {
      var settings = window.wppopups.settings($popup, 'position');
      if (settings.position != 'sticky-left' && settings.position != 'sticky-right') return;
      var sticky_title = $popup.find('.spu-sticky-title');
      $('#spu-bg-' + $popup.data('id')).remove();
      sticky_title.show();
      var popupHeight = $popup.outerHeight(),
          titleHeight = $popup.find('.spu-sticky-title').outerHeight();
      $popup.css({
        "bottom": "-" + (popupHeight - titleHeight) + "px"
      });
    },

    /**
     * Check if user visited the page before and remove popup if not
     */
    sessionCounter: function sessionCounter() {
      var counter = sessionStorage.getItem('wppopups_visited_page') || 0;
      var new_value = parseInt(counter) + 1; // if we have a counter and matches the number of the rule update popup

      sessionStorage.setItem('wppopups_visited_page', new_value);
      return new_value;
    },

    /**
     * Move popup to top/bottom if needed
     * @param $popup
     */
    pushContentPopups: function pushContentPopups($popup) {
      var settings = window.wppopups.settings($popup, 'position');

      if (settings.position == 'top-bar' && settings.push_content == '1') {
        $popup.prependTo('body');
      }
    }
  }; // Initialize.

  WPPopupsPro.init(); // Add to global scope.

  window.wppopups_pro = WPPopupsPro;
})(jQuery);