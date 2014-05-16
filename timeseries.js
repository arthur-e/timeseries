/**@license
 *
 *  The MIT License (MIT)
 *
 *  Copyright (C) 2014 K. Arthur Endsley (kaendsle@mtu.edu)
 *  Michigan Tech Research Institute (MTRI)
 *  3600 Green Court, Suite 100, Ann Arbor, MI, 48105
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 */

/** 
    Array.map polyfill
 */
if (!Array.prototype.map) {
    Array.prototype.map = function (fun, thisArg) {
        'use strict';

        if (this === void 0 || this === null) {
            throw new TypeError();
        }

        var t = Object(this);
        var len = t.length >>> 0;
        if (typeof fun !== 'function') {
            throw new TypeError();
        }

        var res = new Array(len);
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if (i in t) {
                res[i] = fun.call(thisArg, t[i], i, t);
            }
        }

        return res;
    };
}

(function (global) {
	// Establish the root object, window in the browser, or exports on the server
	var root = this;

    if (!moment && (typeof require !== 'undefined')) {
        moment = require('moment');
    }

    /**
        Tests whether or not the passed Object is an Array.
        @param  obj {Object}
        @return     {Boolean}
     */
    function isArray (obj) {
		return !!(obj && obj.constructor === Array);
	};

    /**
        Represents a time series using input Array(s); an Array of data values
        and, optionally, an Array of time stamps or Date objects. There are two
        ways of specifying the series...
         i) Provide nested [ [data], [times] ] Arrays
        ii) Provide [data] Array and start time, interval size, and interval type
        @param  series      {Array}     Either an Array of data or an Array of an Array of data and an Array of time stamps
        @param  start       {Date|String}
        @param  interval    {Number}
        @param  units       {String}    e.g. "minute"|"minutes"|"hour"|"hours"|"day"|"days"...
        @return             {TimeSeries}
     */
	function TimeSeries (series, start, interval, units) {
        var i, t0, t1;

        if (interval !== undefined) {
            if (typeof interval !== 'number') {
                throw TypeError('Expected "interval" argument to be a Number');
            }
        }

        if (isArray(series[0])) {
            this._data = series[0];
            this._time = series[1];

            if (this._time[0]._isAMomentObject !== true) {
                this._time.map(function (t) {
                    return moment.utc(t);
                });
            }

        } else {
            t0 = moment.utc(start);
            t1 = t0.clone();
            this._data = series;
            this._time = [t0];

            i = 1;
            while (i < this._data.length) {
                t1.add(interval, units);
                this._time.push(t1.clone());
                i += 1;
            }

        }

        if (this._data.length !== this._time.length) {
            throw Error('There is not a time for every data value; data and time Arrays are not the same length');
        }
	};

    /**
        Resamples the time series, producing a new TimeSeries instance. Only
        downsampling (from higher temporal resolution to lower resolution) is
        currently supported.
        @param  interval    {Number}
        @param  units       {String}    e.g. "hour"|"hours"|"day"|"days"...
        @param  operation   {Function}  A Function that takes an Array argument and returns a value
        @param  close       {String}    e.g. "right"|"left"
        @return             {TimeSeries}
     */
    TimeSeries.prototype.resample = function (interval, units, operation, closed) {
        var i = 0;
        var j = 0;
        var ds = [];
        var ts = [];
        var t0 = this._time[0];
        var t1 = t0.clone().add(interval, units);

        if (t1.isBefore(this._time[1])) {
            throw Error('Upsampling is not currently supported; specified interval must be a lower temporal resolution than the original');
        }

        while (j < this._data.length) {
            if (this._time[j].isSame(t1) || this._time[j].isAfter(t1)) {
                // Call the operation on the subsequence of data from the last
                //  time point to the current
                if (!this._time[j].isSame(t1) && closed === 'left') {
                    ds.push(operation.call(this, this._data.slice(i, j)));
                } else {
                    ds.push(operation.call(this, this._data.slice(i, j + 1)));
                }

                ts.push(this._time[j]);

                // Update the forward-looking timestamp
                t1.add(interval, units);
                i = j;
            }

            j += 1;
        }

        return new TimeSeries([ds, ts]);
    };

	// Following Underscore module pattern (http://underscorejs.org/docs/underscore.html)
	if (typeof exports !== 'undefined') {
		exports.TimeSeries = TimeSeries;
	} else {
		root.TimeSeries = TimeSeries;
	}

	global.TimeSeries = TimeSeries;
	return this;
}(this));

