// tdate.js     TractDB Date with timeline transform
//
// TDate replaces JavaScript Date, adding the ability to set a linear
// transform of the timeline. If the app uses TDate in place of Date
// throughout, this allows running a trial at accelerated speed, for
// testing and demonstration.
//
// The class TDate has all the usual class methods of Date, plus the
// following:
//
//     setTransform(a, b)    Set transform to f(t) = a * t + b
//
// Note that, for simplicity, just one transformed timeline is
// supported, shared by all instances of TDate.
//
// Instances of TDate are created as for Date, i.e., by new TDate(...)
// Instances have all the usual methods of dates, plus the following:
//
//     inverse()             Return an inversely transformed Date instance
//
// All the usual methods deal in transformed times. Let T be the
// transform (f(t) = a * t + b), and NOW be the usual timestamp of the
// current moment. Then
//
//     new TDate() => a tdate representing T(NOW)
//     TDate.now() => the timestap T(NOW)
//     new TDate(x) => a tdate whose timestamp is x
//     new TDate(y, m, d, h, m, s) => tdate representing the given moment
//
// In essence, TDate works exactly like Date except that the present
// moment moves through time according to the transform. Another way to
// look at this is that a TDate instance has a timestamp that is
// transformed from the usual timestamp. Or conversely, the usual
// timestamp of a TDate instance (its "real" time) is inversely
// transformed from the TDate's timestamp. If the transform is (1, 0),
// there is no difference at all. If the transform is (60, 0),
// transformed times have been proceeding 60 times faster than usual
// since the beginning of the epoch.
//
// The inverse() method is used by those parts of the system that need
// to know the "real" time corresponding to a transformed time. (In the
// current setup, just the lowest level of the Reminders module needs to
// know this.)
//

'use strict';

(angular.module('tractdb.tdate', [])

.factory('TDate', function() {

    // Coefficients of the transform.
    //
    var a = 1, b = 0;

    // Transform and its inverse.
    //
    function T(t) { return Math.round(a * t + b); }
    function Tinv(t) { return Math.round((t - b) / a); }

    // Constructor.
    //
    function TDate()
    {
        // A TDate instance has a transformed date inside to which it
        // delegates almost all methods. (It's actually not possible to
        // create a JS-style "subclass" of Date.)
        //

        if (!(this instanceof TDate)) {
            // Constructor called without "new". This returns a string
            // representing the current moment.
            //
            return new Date(T(Date.now())).toString();
        } else if (arguments.length == 0) {
            // Zero-argument form denotes the current moment, which is
            // transformed.
            //
            this.tdate = new Date(T(Date.now()));
        } else {
            // All other forms denote a specified moment, acting as
            // usual.
            //
            // It's possible but extremely tricky to create a new Date
            // object from an array of arguments. (I got basic plan here
            // from the net.)
            //
            var args = Array.prototype.slice.call(arguments);
            args.unshift(Date);
            var dfact = Date.bind.apply(Date, args);
            this.tdate = new dfact();
        }
    }

    // Interesting methods.
    //
    // (The rest are just delegations to Date or this.tdate.)
    //

    TDate.now = function() {
        return T(Date.now());
    }

    TDate.setTransform = function(newa, newb) {
        a = newa;
        b = newb;
    }

    TDate.prototype = {};

    TDate.prototype.inverse = function() {
        return new Date(Tinv(this.tdate.getTime()));
    }

    // Delegated class methods.
    //

    TDate.parse = function(s) {
        return Date.parse(s);
    }

    TDate.UTC = function() {
        return Date.UTC.apply(null, arguments);
    }

    // Delegated instance methods.
    //

    TDate.prototype.getDate = function() { return this.tdate.getDate(); }
    TDate.prototype.getDay = function() { return this.tdate.getDay(); }
    TDate.prototype.getFullYear = function() {
        return this.tdate.getFullYear();
    }
    TDate.prototype.getHours = function() { return this.tdate.getHours(); }
    TDate.prototype.getMilliseconds = function() {
        return this.tdate.getMilliseconds();
    }
    TDate.prototype.getMinutes = function() { return this.tdate.getMinutes(); }
    TDate.prototype.getMonth = function() { return this.tdate.getMonth(); }
    TDate.prototype.getSeconds = function() { return this.tdate.getSeconds(); }
    TDate.prototype.getTime = function() { return this.tdate.getTime(); }
    TDate.prototype.getTimezoneOffset = function() {
        return this.tdate.getTimezoneOffset();
    }
    TDate.prototype.getUTCDate = function() { return this.tdate.getUTCDate(); }
    TDate.prototype.getUTCDay = function() { return this.tdate.getUTCDay(); }
    TDate.prototype.getUTCFullYear = function() {
        return this.tdate.getUTCFullYear();
    }
    TDate.prototype.getUTCHours = function() {
        return this.tdate.getUTCHours();
    }
    TDate.prototype.getUTCMilliseconds = function() {
        return this.tdate.getUTCMilliseconds();
    }
    TDate.prototype.getUTCMinutes = function() {
        return this.tdate.getUTCMinutes();
    }
    TDate.prototype.getUTCMonth = function() {
        return this.tdate.getUTCMonth();
    }
    TDate.prototype.getUTCSeconds = function() {
        return this.tdate.getUTCSeconds();
    }
    TDate.prototype.getYear = function() { return this.tdate.getYear(); }

    TDate.prototype.setDate = function(n) { return this.tdate.setDate(n); }
    TDate.prototype.setFullYear = function(n) {
        return this.tdate.setFullYear(n);
    }
    TDate.prototype.setHours = function(n) { return this.tdate.setHours(n); }
    TDate.prototype.setMilliseconds = function(n) {
        return this.tdate.setMilliseconds(n);
    }
    TDate.prototype.setMinutes = function(n) {
        return this.tdate.setMinutes(n);
    }
    TDate.prototype.setMonth = function(n) { return this.tdate.setMonth(n); }
    TDate.prototype.setSeconds = function(n) {
        return this.tdate.setSeconds(n);
    }
    TDate.prototype.setTime = function(n) { return this.tdate.setTimeh(n); }
    TDate.prototype.setUTCDate = function(n) {
        return this.tdate.setUTCDate(n);
    }
    TDate.prototype.setUTCFullYear = function(n) {
        return this.tdate.setUTCFullYear(n);
    }
    TDate.prototype.setUTCHours = function(n) {
        return this.tdate.setUTCHours(n);
    }
    TDate.prototype.setUTCMilliseconds = function(n) {
        return this.tdate.setUTCMilliseconds(n);
    }
    TDate.prototype.setUTCMinutes = function(n) {
        return this.tdate.setUTCMinutes(n);
    }
    TDate.prototype.setUTCMonth = function(n) {
        return this.tdate.setUTCMonth(n);
    }
    TDate.prototype.setUTCSeconds = function(n) {
        return this.tdate.setUTCSeconds(n);
    }
    TDate.prototype.setYear = function(n) { return this.tdate.setYear(n); }

    TDate.prototype.toDateString = function() {
        return this.tdate.toDateString();
    }
    TDate.prototype.toISOString = function() {
        return this.tdate.toISOString();
    }
    TDate.prototype.toJSON = function() { return this.tdate.toJSON(); }
    TDate.prototype.toGMTString = function() {
        return this.tdate.toGMTString();
    }
    TDate.prototype.toLocaleDateString = function() {
        return this.tdate.toLocaleDateString();
    }
    TDate.prototype.toLocaleString = function() {
        return this.tdate.toLocaleString();
    }
    TDate.prototype.toLocaleTimeString = function() {
        return this.tdate.toLocaleTimeString();
    }
    TDate.prototype.toString = function() { return this.tdate.toString(); }
    TDate.prototype.toTimeString = function() {
        return this.tdate.toTimeString();
    }
    TDate.prototype.toUTCString = function() {
        return this.tdate.toUTCString();
    }
    TDate.prototype.valueOf = function() { return this.tdate.valueOf(); }

    return TDate;
})
);
