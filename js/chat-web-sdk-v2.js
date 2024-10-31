"use strict";

/**
 * Initialize chat SDK
 *
 * @constructor
 * @param {string} sdkUrl - Url where to connect
 * @param {Object} config - Configuration
 * @param {string} config.userId - User ID
 * @param {string} config.logLevel - Minimum log level (trace|debug|info|warn|error)
 * @param {string} config.demoForm - Show demo form UI, also affects customer initial data (customer field is ignored)
 * @param {Object} config.customer - Initial customer data
 * @param {string} config.customer.customerId - ClientID, "0" by default
 * @param {boolean} config.customer.segment - Segment, "private" by default
 * @param {string} config.customer.customerFullName - Full name of customer. Users with different Full Name will have different sessions
 * @param {boolean} config.customer.secure - Secure
 * @param {Object} config.options - Customer specific data
 * @public
 * @class
 */

function initChatSdk(sdkUrl, optionalArguments = {}) {
  let {
    userId = "",
    logLevel = "",
    demoForm = "",
    customer = "",
    options = {},
    target = "",
    isChatLaunched = options?.exclude_launch,
    message = "",
  } = optionalArguments;

  const defaultStyles = {
    custom_bubble_style: {
      bottom: "0%",
      height: "80%",
      border: "none",
      position: "fixed",
      width: "100%",
      "max-width": "376px",
      right: "0px",
      transition: "bottom 0.6s, opacity 0.8s",
    },
    custom_bubble_style_mobile: {
      bottom: "0%",
      height: "100%",
      border: "none",
      position: "fixed",
      width: "100%",
      right: "0px",
      transition: "bottom 0.6s, opacity 0.8s",
    },
  };
  let showChatLauncherStyle = options?.showChatLauncherStyle;
  if (!showChatLauncherStyle)
    showChatLauncherStyle = {
      "z-index": 10000,
      height: "64px",
      width: "64px",
      position: "fixed",
      right: "15px",
      bottom: "15px",
      cursor: "pointer",
      opacity: 1,
      border: "none",
      transition: "opacity 0.8s",
    };
  const sdkOrigin =
    window.location.protocol + "//" + window.location.host + "/";
  let setCustomerRef;
  const chat = {
    _iframe: null,
    ready: false,
    onReady: () => {},
    onClose: () => {},
    onOpen: () => {},
    send: send,
    setCustomer: setCustomer,
    setOptions: setOptions,
  };

  /**
   * Send message
   *
   * @public
   * @param message Any valid message object
   * @returns {Promise<void>}
   */
  function send(message) {
    if (!chat.ready) return;

    chat._iframe.contentWindow.postMessage(
      { event: "send", args: message },
      sdkUrl
    );

    return Promise.resolve();
  }

  /**
   * Updates customer data
   *
   * @public
   * @param data Any valid customer data
   * @returns {Promise<unknown>}
   */
  function onWindowChange(x) {
    chat?._iframe?.contentWindow?.postMessage(
      { event: "windowResize", args: { isMobile: x.matches } },
      sdkUrl
    );
    if (isChatLaunched) {
      removeStyle(showChatLauncherStyle, iframe);
      if (x.matches) {
        // If media query matches
        removeStyle(
          options?.custom_bubble_style || defaultStyles.custom_bubble_style,
          iframe
        );
        applyStyle(
          options?.custom_bubble_style_mobile ||
            defaultStyles.custom_bubble_style_mobile,
          iframe
        );
      } else {
        removeStyle(
          options?.custom_bubble_style_mobile ||
            defaultStyles.custom_bubble_style_mobile,
          iframe
        );
        applyStyle(
          options?.custom_bubble_style || defaultStyles.custom_bubble_style,
          iframe
        );
      }
    }
    return x.matches;
  }

  function setCustomer(data) {
    if (!chat.ready) {
      console.error("Chat not ready! Can not update the session");
      return;
    }

    chat._iframe.contentWindow.postMessage(
      { event: "setCustomer", args: data },
      sdkUrl
    );
    return new Promise((resolve, reject) => {
      setCustomerRef = resolve;
    });
  }

  /**
   * Updates customer specific optionsdata
   *
   * @public
   * @param newOptions Any dictionary
   * @returns None
   */
  function setOptions(newOptions) {
    if (!chat.ready) {
      console.error("Chat not ready! Can not update the session");
      return;
    }
    chat._iframe.contentWindow.postMessage(
      { event: "setOptions", args: newOptions },
      sdkUrl
    );
  }

  function applyStyle(s, iframe) {
    if (s) {
      for (let [key, value] of Object.entries(s)) {
        iframe.style[key] = value;
      }
    }
  }

  function removeStyle(s, iframe) {
    if (s) {
      for (let key of Object.keys(s)) {
        iframe.style[key] = null;
      }
    }
  }

  function handleMessage(e) {
    const { event, args } = e.data;
    if (event === "ready") {
      chat.ready = true;
      chat.onReady(args);
      return;
    }
    if (!options.exclude_launch) {
      if (event === "close_window") {
        isChatLaunched = false;
        iframe.style.bottom = "-100%";

        setTimeout(() => {
          removeStyle(
            options?.custom_bubble_style || defaultStyles.custom_bubble_style,
            iframe
          );
          removeStyle(
            options?.custom_bubble_style_mobile ||
              defaultStyles.custom_bubble_style_mobile,
            iframe
          );
          applyStyle(showChatLauncherStyle, iframe);
        }, 400);

        chat.onClose(args);
        return;
      }
      if (event === "open_window") {
        isChatLaunched = true;
        iframe.style.bottom = "-100%";
        setTimeout(() => {
          removeStyle(showChatLauncherStyle, iframe);
          onWindowChange(query);
        }, 0);
        chat.onOpen(args);
        return;
      }
    }

    if (event === "session_update") {
      if (setCustomerRef) {
        setCustomerRef();
        setCustomerRef = null;
      }
      return;
    }

    if (event === "clipboard_write") {
      navigator.clipboard.writeText(args.text);
      return;
    }
  }

  /* INITIALIZATION */
  logLevel = logLevel || "warn";
  demoForm = demoForm || "false";
  const iframe = target
    ? document.getElementById(target)
    : document.createElement("iframe");
  let query = window.matchMedia("(max-width: 679px)");
  chat._iframe = iframe;

  if (!options?.exclude_launch) applyStyle(showChatLauncherStyle, iframe);
  options.isMobile = onWindowChange(query);
  if (options?.exclude_launch) options.isMobile = options?.exclude_launch;
  query.addListener(onWindowChange); // Attach listener function on state changes

  const url = new URL(sdkUrl);
  const params = Object.assign(
    {
      origin: sdkOrigin,
      "log-level": logLevel,
      "demo-form": demoForm,
      customer_proxy: userId,
      options: JSON.stringify(options || {}),
    },
    { segment: "Anonymous" },
    customer
  );

  const queryParams = sdkUrl.split("?");
  if (queryParams.length > 1 && queryParams[1].startsWith("token=")) {
    params.token = queryParams[1].split("=")[1];
  }

  url.search = new URLSearchParams(params);

  iframe.setAttribute("src", url.toString());
  if (!target) {
    iframe.setAttribute("id", "chat-web-sdk");
    document.body.append(iframe);
  }

  window.addEventListener("message", handleMessage, false);
  if (message) send(message);

  chat.destroy = function () {
    window.removeEventListener("message", handleMessage);
    if (!target) {
      iframe.remove();
    }
  };

  chat.hidden = false;
  chat.hide = function () {
    chat.hidden = true;
    window.removeEventListener("message", handleMessage);
    if (!target) {
      iframe.style.display = "none";
    }
  };
  chat.show = function () {
    chat.hidden = false;
    window.addEventListener("message", handleMessage, false);
    iframe.style.display = "block";
  };

  return chat;
}
