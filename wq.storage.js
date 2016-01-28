(function($) {
    JD.GLOBAL_CONFIG.STORE_CALLBACK = {};
    var mystore = getStoreage();
    $.store._exeStore = function() {
            var op = arguments[0];
            var fun = mystore[arguments[0]];
            fun.apply(mystore, Array.prototype.slice.call(arguments, 1));
        }
        //准备好事件后，检查队列，或者直接执行
    $.events.trigger("event_store_quene");


    function getStoreage(domain, path) {

        var XDStorage = function() {
            this.origin = "";
            this.path = "";
            this._iframe = null;
            this._iframeReady = false;
            this._queue = [];
            this._requests = {};
            this._id = 0;
        }


        XDStorage.prototype = {

            op: {
                WRITE: 'W',
                READ: 'R',
                DEL: 'D',
                CLEAR: 'X',
                GETALLMODULEJS: 'M'
            },
            //restore constructor  
            constructor: XDStorage,

            //public interface methods  

            init: function() {
                try {

                    if (!this._iframe) {


                        if (window.JSON && window.localStorage && window.postMessage && 'localStorage' in window && window['localStorage'] !== null) {
                            this._iframe = document.createElement("iframe");
                            this._iframe.style.cssText = "position:absolute;width:1px;height:1px;left:-9999px;";
                            document.body.appendChild(this._iframe);

                            if (window.addEventListener) {
                                this._iframe.addEventListener("load", function() {
                                    that._iframeLoaded();
                                }, false);
                                window.addEventListener("message", function(event) {
                                    that._handleMessage(event);
                                }, false);
                            }
                        } else {
                            // throw new Error("Unsupported browser.");

                            //throw new Error("Unsupported browser.");

                            this._queue.every(function(o) {
                                if (o.request && o.request.timer) {
                                    clearTimeout(o.request.timer);
                                };

                                o.callback && o.callback(null, null, {
                                    errNo: 4
                                });



                            });
                            return false;

                        }
                    }

                    this._iframe.src = "//" + this.origin.replace(/^((https||http):?)\/\//, "") + this.path;

                } catch (ex) {

                }

                var that = this;

            },

            get: function(key, callback, domain, isSessionStorage) {
                this._toSend({
                    key: key,
                    op: this.op.READ
                }, callback, domain, isSessionStorage);
            },

            getAllModulejs: function(callback, domain) { //为modulejs专用
                this._toSend({
                    key: "getmodulejs",
                    op: this.op.GETALLMODULEJS,

                }, callback, domain);
            },

            setValue: function(key, str, expires, callback) {
                expires = expires !== 0 ? expires || 5 : expires;
                var iTime = new Date().getTime() + expires * 60 * 1000;
                var obj = {
                    value: str,
                    expires: iTime
                };
                this.set(key, obj, callback);
            },
            getValue: function(key, callback) {
                var iTime = new Date().getTime();
                var self = this;
                this.get(key, function(key, valueObj, res) {
                    var storeValue = null;
                    //has value+has expires item+not expires
                    if (valueObj && valueObj.expires) {
                        if (valueObj.expires > iTime) {
                            storeValue = valueObj.value;
                        } else {
                            JD.store.del(key);
                        }
                    }

                    callback && callback(key, storeValue, res);

                });
            },
            set: function(key, value, callback, domain, isSessionStorage) {

                this._toSend({
                    key: key,
                    op: this.op.WRITE,
                    value: value,
                }, callback, domain, isSessionStorage);
            },
            del: function(key, callback, domain, isSessionStorage) {
                this._toSend({
                    key: key,
                    op: this.op.DEL,
                }, callback, domain, isSessionStorage);
            },
            clear: function(callback, domain, isSessionStorage) {
                this._toSend({
                    op: this.op.CLEAR,

                }, callback, domain, isSessionStorage);
            },
            //private methods  

            _toSend: function(params, callback, domain, isSessionStorage) {

                domain = domain || "wqs.jd.com";
                if (document.domain == domain.replace(/^((https||http):?)\/\//, "")) {

                    try {
                        if (window.JSON && window.localStorage && window.postMessage && 'localStorage' in window && window['localStorage'] !== null) {
                            var storage = isSessionStorage ? window.sessionStorage : window.localStorage;
                            var value;

                            if (params.op === 'M') { //写操作  
                                var arrJs = [];
                                for (var key in localStorage) {
                                    if (/^_m_/.test(key)) {
                                        arrJs.push({
                                            key: key,
                                            obj: localStorage.getItem(key)
                                        });
                                    }
                                }

                                callback && callback(params.key, arrJs, {
                                    errNo: 0
                                });


                            } else if (params.op === 'W') { //写操作  
                                try {
                                    storage.setItem(params.key, JSON.stringify(params.value));
                                    callback && callback(null, null, {
                                        errNo: 0
                                    });
                                } catch (e) {
                                    try {
                                        JD.report.umpBiz({
                                            bizid: 45,
                                            operation: 1,
                                            result: 1,
                                            source: 0,
                                            message: (isSessionStorage ? 'sessionStorage' : 'localStorage')
                                        });
                                    } catch (e) {}
                                }
                            } else if (params.op === 'D') { //删除  
                                storage.removeItem(params.key);
                                callback && callback(null, null, {
                                    errNo: 0
                                });

                            } else if (params.op === 'X') { //清空  
                                storage.clear();
                                callback && callback(null, null, {
                                    errNo: 0
                                });

                            } else { //默认：读操作  
                                var tmpValue = storage.getItem(params.key);
                                try {
                                    value = JSON.parse(tmpValue);
                                } catch (ex) {
                                    value = tmpValue;
                                }

                                callback && callback(params.key, value, {
                                    errNo: 0
                                });

                            }
                        } else {
                            callback && callback(params.key, null, {
                                errNo: 0
                            });
                            try {
                                JD.report.umpBiz({
                                    bizid: 45,
                                    operation: 1,
                                    result: 2,
                                    source: 0,
                                    message: (isSessionStorage ? 'sessionStorage' : 'localStorage')
                                });
                            } catch (e) {}
                        }

                    } catch (ex) {
                        callback && callback(params.key, null, {
                            errNo: 1
                        });
                        try {
                            JD.report.umpBiz({
                                bizid: 45,
                                operation: 1,
                                result: 2,
                                source: 0,
                                message: (isSessionStorage ? 'sessionStorage' : 'localStorage')
                            });
                        } catch (e) {}
                        //   window.checkCRSerr&&window.checkCRSerr(e,1);
                    }
                } else {
                    // try {
                    if (!/wq.jd.com/.test(document.domain)) {
                        this.origin = "wq.jd.com";
                        this.path = "/mcoss/mportal/show?tpl=18&tabid=18?1209";
                        //mystore = getStoreage("wq.jd.com", "/mcoss/mportal/show?tpl=18&tabid=18");
                    } else {
                        this.origin = "wqs.jd.com";
                        this.path = "/portal/wx/storageBridge2.shtml?1209";

                    }
                    var eventTimer;
                    var eventid = ++this._id;
                    if (params.op == "R" || params.op == "M") { //对于读的的时候加出错处理
                        var obj = this;
                        var mytimer = function(cb) {
                            eventTimer = setTimeout(function() {
                                if (obj._requests[eventid]) {
                                    obj._requests[eventid] = null;
                                    delete obj._requests[eventid];
                                }
                                if (JD.GLOBAL_CONFIG.STORE_CALLBACK["cb" + eventid]) {

                                    return;

                                }
                                JD.GLOBAL_CONFIG.STORE_CALLBACK["cb" + eventid] = true;



                                //should delete waitingevet object
                                callback && callback(params.key, null, {
                                    errNo: 2
                                });



                                //  console.log("调用出错trigger timer" + eventTimer);
                            }, 5000);
                        }; //3s以后不返回会自动触发
                        mytimer(callback);



                    }
                    //  console.log("timer......."+eventTimer);

                    var data = {
                        request: {
                            key: params.key,
                            id: eventid,
                            op: params.op,
                            value: params.value,
                            timer: eventTimer,
                            ss: isSessionStorage ? 1 : 0 //1 session 0 local
                        },
                        callback: callback
                    };
                    if (this._iframeReady) {
                        this._sendRequest(data);
                    } else {
                        this._queue.push(data);
                    }

                    if (!this._iframe) {
                        this.init();
                    }
                    /* } catch (ex) {
                        window.checkCRSerr&&window.checkCRSerr(ex,2);
                    }*/
                }

            },

            _sendRequest: function(data) {


                // try {
                this._requests[data.request.id] = data;
                this._iframe.contentWindow.postMessage(JSON.stringify(data.request), location.protocol + "//" + this.origin.replace(/^((https||http):?)\/\//, ""));

                /*} catch (ex) {
                    window.checkCRSerr&&window.checkCRSerr(ex,3);
                }*/

            },

            _iframeLoaded: function() {


                //try {
                this._iframeReady = true;

                if (this._queue.length) {
                    for (var i = 0, len = this._queue.length; i < len; i++) {
                        this._sendRequest(this._queue[i]);
                    }
                    this._queue = [];
                }
                /* } catch (ex) {
                    window.checkCRSerr&&window.checkCRSerr(ex,4);
                }*/

            },

            _handleMessage: function(event) {
                // try {
                if (event.origin.replace(/^((https||http):?)\/\//, "") == this.origin) {
                    var data = JSON.parse(event.data);
                    if (this._requests[data.id]) {
                        if (data.timer) {

                            clearTimeout(data.timer);

                        }

                        if (JD.GLOBAL_CONFIG.STORE_CALLBACK["cb" + data.id]) {
                            return;
                        }
                        JD.GLOBAL_CONFIG.STORE_CALLBACK["cb" + data.id] = true;

                        this._requests[data.id].callback && this._requests[data.id].callback(data.key, data.value, {
                            errNo: 0
                        });
                        delete this._requests[data.id];
                    }

                }
                /*  } catch (ex) {
                    window.checkCRSerr&&window.checkCRSerr(ex,5);
                }*/

            }

        };

        return new XDStorage(domain, path);

    }
})(JD);
(function() {
    var ua = navigator.userAgent;
    var wgStorage = {
        // 缓存代理页
        sProxyUrl: 'http://wqs.jd.com/portal/wx/storageBridge.shtml',
        // localstorage所在域名
        sDomain: 'wqs.jd.com',
        // 缓存key
        sCacheKey: 'jdHistory',
        // 浏览历史缓存数据结构
        oItemStruct: {
            type: '1',
            key: '',
            url: '',
            title: '',
            desc: '',
            img: '',
            time: ''
        },
        // 是否为android手机
        isAnroid: ua.match(/(Android);?[\s\/]+([\d.]+)?/),
        // 回调函数map
        oCallbacks: {},
        // iframe通信状态tag
        bIsInitMsg: false,
        /**
         * 发送消息到iframe
         * @param  {string}   sType    操作类型
         * @param  {object}   data     传递的数据
         * @param  {Function} callback 回调函数
         */

        /**
         * 获取数据
         * @param  {string}   key      缓存数据的key
         * @param  {Function} callback 回调函数
         */
        get: function(key, callback) {
            var me = this;
            JD.store.get("jdHistory", function(key, value) {
                if (!value || value.length == 0) {
                    value = {};
                }
                callback && callback.call(me, value);
            });


        },

        /**
         * 添加缓存数据
         * @param {object} data 缓存的数据
         */
        set: function(data, igOrreCheckEnv) {
            if (!igOrreCheckEnv && JD.device.scene == "weixin") return; //上线去掉注释,微信不需要这个
            var iTime = (new Date()).getTime(),
                me = this;
            this.get(this.sCacheKey, function(oHisCache) {
                var arrHisData = oHisCache.arrHisData;
                if (!arrHisData) arrHisData = [];
                data.time = iTime;

                for (var key in wgStorage.oItemStruct) {
                    if (!data[key]) {
                        data[key] = wgStorage.oItemStruct[key];
                    }
                }
                // 遍历所有记录，找出相同项
                for (var i = 0; i < arrHisData.length; i++) {
                    var item = arrHisData[i];

                    if (data.key === item.key) {
                        if (!data.url) data.url = data.key;
                        //xuyafei
                        if (data.refer && data.refer.indexOf('searchfootprint') > -1) return;
                        // 更新旧记录
                        arrHisData[i] = data;
                        oHisCache.arrHisData = arrHisData;
                        wgStorage.writeHistory(oHisCache, 1);
                        return me;
                    }
                }
                // 添加新纪录
                if (!data.url) data.url = data.key;
                arrHisData.unshift(data);
                oHisCache.arrHisData = arrHisData;
                wgStorage.writeHistory(oHisCache, 1);
            });
            return this;
        },
        /**
         * 将数据写入缓存
         * @param  {object}   oHisCache 缓存的数据
         * @param  {string}   type      操作类型（读/写）
         * @param  {Function} callback  操作完成回调函数
         */
        writeHistory: function(oHisCache, type, callback) {
            var sDataDtr,
                oBackHisData = {};
            try {
                !oHisCache.arrHisData && (oHisCache.arrHisData = []);
                // 按照添加的时间倒序排列
                oHisCache.arrHisData.sort(function(a, b) {
                    if (a.time > b.time) return -1;
                    else if (a.time < b.time) return 1;
                    else return 0;
                });

                // 只取最新20条记录
                oHisCache.arrHisData = oHisCache.arrHisData.slice(0, window.storageHistoryRecordMaxNum || 20);
                oHisCache.update = type || 0;

                if (this.isAnroid) {
                    for (var key in oHisCache) {
                        oBackHisData[key] = oHisCache[key];
                    }
                    oBackHisData.arrHisData = oBackHisData.arrHisData.slice(0, 2);
                    //this.setCookie(this.sCacheKey, JSON.stringify(oBackHisData), 43200, '', 'wanggou.com');
                    //this.setCookie(this.sCacheKey, '', -1, '', 'wanggou.com');
                    this.setCookie(this.sCacheKey, '', -1, '', 'jd.com');
                }

                //JD.store.set(wgStorage.sCacheKey,oHisCache);
                var o = this;
                JD.store.set(wgStorage.sCacheKey, oHisCache, function(result) {
                    callback && callback.call(o);
                })


            } catch (e) {

            }
            return this;
        },
        /**
         * 检查是否需要展示提示小黄条
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        check: function(callback) {
            // this.setCookie(this.sCacheKey, '', -1, '', 'wanggou.com');
            this.setCookie(this.sCacheKey, '', -1, '', 'jd.com');
            var iNow = (new Date()).getTime(),
                iLimit = 600,
                iai = (typeof JD != 'undefined' && JD.url.getUrlParam('isappinstalled')) || '',
                me = this;
            this.get(this.sCacheKey, function(oHisCache) {
                try {
                    var arrHisData = oHisCache.arrHisData;
                    // 如果是首次进入、距离离开时间在10分钟之内，有添加新纪录并且还未展示过小黄条
                    if (((location.href.indexOf('ptype=') > -1 && history.length === 1) /*|| location.href.indexOf('mdebug') > -1*/) &&
                        arrHisData &&
                        arrHisData.length > 0 &&
                        oHisCache.update != 0 &&
                        window.hideHis != true &&
                        !iai) {

                        var oHisItem = arrHisData[0],
                            iTime = oHisItem.time,
                            iDiff = (iNow - iTime) / 1000;

                        if (iDiff < iLimit) {
                            callback && callback.call(me, iDiff, oHisItem);
                        }
                    }
                } catch (e) {}

                // 刷新缓存，标记已经校验/展示小黄条
                if (oHisCache.update != 0) {
                    wgStorage.writeHistory(oHisCache, 0, function() {
                        wgStorage.ready();
                    });
                } else {
                    wgStorage.ready();
                }
                return this;
            });
        },
        /**
         * 历史记录初始化完成事件
         */
        ready: function() {
            var me = this;
            window.wgStorage = wgStorage;
            if (window.wgStorageReady) {
                window.wgStorageReady(wgStorage);
            }
        },
        getCookie: function(name) {
            var reg = new RegExp("(^| )" + name + "(?:=([^;]*))?(;|$)"),
                val = document.cookie.match(reg);
            return val ? (val[2] ? unescape(val[2]) : "") : null;
        },
        setCookie: function(name, value, expires, path, domain, secure) {
            var exp = new Date(),
                expires = arguments[2] || null,
                path = arguments[3] || "/",
                domain = arguments[4] || null,
                secure = arguments[5] || false;
            expires ? exp.setMinutes(exp.getMinutes() + parseInt(expires)) : "";
            document.cookie = name + '=' + escape(value) + (expires ? ';expires=' + exp.toGMTString() : '') + (path ? ';path=' + path : '') + (domain ? ';domain=' + domain : '') + (secure ? ';secure' : '');
        }
    }

    function doCheck() {
        // 检查是否需要展示小黄条
        wgStorage.check(function(iDiff, oHisItem) {
            var dHisTip = document.createElement('div'),
                iMinute = Math.floor(iDiff / 60);

            dHisTip.innerHTML = '<span class="wx_history_close" id="wx_history_close" ptag="37075.2.3">关闭</span><a ptag="37075.2.2" href="' + oHisItem.url + '" ><strong>' + (iMinute > 0 ? (iMinute + '分钟前') : '刚刚') + '您在浏览：</strong><p>' + $htmlEncode(oHisItem.title.replace('搜索到', '')) + '</p></a>';

            dHisTip.className = 'wx_history';
            document.body.appendChild(dHisTip);
            try {
                ECC.cloud.report.trace({
                    ptag: '37075.2.1'
                })
            } catch (e) {}

            var hclose = document.getElementById('wx_history_close');
            hclose.addEventListener('click', function() {
                dHisTip.style.display = 'none';
            });
            // 5秒钟后小黄条消失
            setTimeout(function() {
                dHisTip.style.display = 'none';
            }, 5000);
        });
    }
    doCheck();

    var debugqq = window.GLOBAL_DEBUG_QQ,
        jdpin = JD.cookie.get("jdpin");


    //if (debugqq && jdpin && debugqq.toLowerCase().indexOf("," + jdpin.toLowerCase() + ",") > 0) {
    setTimeout(function() {
        setHistory();
    }, 2000);

    //}

    function setHistory() {
        setTimeout(function() {
            var share = window.shareConfig;
            //微信+没有设置手动上报+分享内容完整+不是portal页+不是Tab页面
            if (JD.device.scene == "weixin" && share && share.link && share.title && share.desc && JD.GLOBAL_CONFIG && !JD.GLOBAL_CONFIG.CUSTOM_SET_HISTORY && !window.GLOBAL_WX_HEADER && !window.GLOBAL_WX_PORAL_PAGE) {
                // type:1,写入普通的
                JD.store.setHistory({
                    // 记录类型
                    type: '1',
                    // 记录的唯一标识
                    key: shareConfig.link,
                    url: shareConfig.link,
                    // 记录标题
                    title: shareConfig.title,
                    // 描述
                    desc: shareConfig.desc,
                    // 图片
                    img: shareConfig.img_url
                });
            }


        }, 2000);

    }

    function $htmlEncode(str) {
        return typeof(str) != "string" ? "" : str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/\'/g, "&apos;").replace(/ /g, "&nbsp;");
    }
})();

(function() {

    setTimeout(function() {
        if (JD.GLOBAL_CONFIG.ARR_DELAY_PPMS.length > 0) {
            var arr = JD.GLOBAL_CONFIG.ARR_DELAY_PPMS.map(function(o) {
                return "/data/ppms/js/ppms.page{#ppmsid#}.jsonp".replace("{#ppmsid#}", o);
            });

            JD.sendJs('//wq.360buyimg.com/c/=' + arr.join(",") + "?t=" + parseInt(new Date().getTime() / 60000, 10)); //30分钟内的缓存相同


        }

    }, 1000);

})();