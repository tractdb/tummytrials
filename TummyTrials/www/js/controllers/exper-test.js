// exper-test.js     Some tests of the experiments module
//
(angular.module('tummytrials.exper-test', [ 'tummytrials.experiments' ])

.factory('ExperTest', function(Experiments) {

    function deep_equals(a, b)
    {
        // Compare a, b for equality. This borders on the impossible for
        // arbitrary JavaScript values. As a simplification, assume that
        // a and b can be fully represented in JSON.
        //
        var i;

        if (Object(a) !== a || Object(b) !== b)
            return a === b;
        if (typeof a == 'function' || typeof b == 'function')
            return false; // This violates JSON assumption
        if (Array.isArray(a) || Array.isArray(b)) {
            if (!Array.isArray(a) || !Array.isArray(b) || a.length != b.length)
                return false;
            for (i = 0; i < a.length; i++)
                if (!deep_equals(a[i], b[i]))
                    return false;
            return true;
        }
        var aps = Object.getOwnPropertyNames(a);
        for (i = 0; i < aps.length; i++)
            if (    !b.hasOwnProperty(aps[i]) ||
                    !deep_equals(a[aps[i]], b[aps[i]]))
                return false;
        var bps = Object.getOwnPropertyNames(b);
        for (i = 0; i < bps.length; i++)
            if (!a.hasOwnProperty(bps[i]))
                return false;
        return true;
    }

    function by_revchrono(a, b)
    {
        if (a.start_time < b.start_time) return 1;
        if (a.start_time > b.start_time) return -1;
        return 0;
    }

    function test_exper(n)
    {
        // Return an experiment object corresponding to the small
        // integer n. This is a pure function; the value depends only on
        // n. Values are different for different ns. Values cannot be
        // confused with genuine experiments.
        //
        // Note: we depend on this mapping from n % 3 to status:
        // 0 => ended
        // 1 => abandonded
        // 2 => active
        //
        var far_future = 4594755902;
        var exper = {};
        exper.name = 'Test Experiment ' + n;
        exper.start_time = far_future + n * 24 * 60 * 60;
        exper.end_time = exper.start_time + 7 * 24 * 60 * 60;
        exper.status = ['ended', 'abandoned', 'active'][n % 3];
        exper.comment = 'This is test experiment ' + n;
        exper.symptoms = ['nausea'];
        exper.reminders = [exper.start_time + 2 * 60 * 60];
        return exper;
    }

    function test_exper_it(n, id, type)
    {
        // Return a test experiment object with an id and type. This
        // looks like a full experiment as returned by Experiments.
        //
        var res = test_exper(n);
        res.id = id;
        res.type = type;
        return res;
    }

    function add_test_expers_p(ns)
    {
        // Return a promise to add test experiments for small integers
        // in the array ns. The promise resolves to an array of ids for
        // the added experiments (ordered the same as ns).
        //
        var res = [];

        function add_i_p(i)
        {
            if (i >= ns.length)
                return res;
            return Experiments.add(test_exper(ns[i]))
            .then(function(id) {
                res.push(id);
                return add_i_p(i + 1);
            });
        }

        return add_i_p(0);
    }

    function cleanup_expers_p(ids, i)
    {
        if (i >= ids.length)
            return null;
        return Experiments.delete(ids[i])
        .then(
            function(_) { return cleanup_expers_p(ids, i + 1); },
            function(_) { return cleanup_expers_p(ids, i + 1); }
        );
    }

    function validate_expers_order(expers, tag)
    {
        for (var i = 1; i < expers.length; i++)
            if (expers[i - 1].start_time < expers[i].start_time) {
                console.log('validate_expers_order<' + tag + '>: failure');
                throw new Error('validate_expers_order<' + tag + '>');
            }
        console.log('validate_expers_order(' + tag + '): success');
    }

    function validate_exper_equal(a, b, tag)
    {
        if (!deep_equals(a, b)) {
            console.log('validate_exper_equal<' + tag + '>: failure');
            throw new Error('validate_exper_equal<' + tag + '>');
        }
        console.log('validate_exper_equal<' + tag + '>: success');
    }

    function validate_expers_equal(as, bs, tag)
    {
        if (!deep_equals(as, bs)) {
            console.log('validate_expers_equal<' + tag + '>: failure');
            throw new Error('validate_expers_equal<' + tag + '>');
        }
        console.log('validate_expers_equal<' + tag + '>: success');
    }

    return {
        testAll: function() {
            var ns = [3, 1, 2];
            var xbefore, xids, xafter;

            return Experiments.all()
            .then(function(expers) {
                xbefore = expers;
                // Want reverse chronological order
                validate_expers_order(xbefore, 'testAll before');
                return add_test_expers_p(ns);
            })
            .then(function(ids) {
                xids = ids;
                return Experiments.all();
            })
            .then(function(expers) {
                xafter = expers;
                for (var i = 0; i < ns.length; i++) {
                    var nx = test_exper_it(ns[i], xids[i], xafter[0].type);
                    xbefore.push(nx);
                }
                xbefore.sort(by_revchrono);
                // Want after = ordered union of before + new expers
                validate_expers_equal(xbefore, xafter, 'testAll after');
                return null;
            })
            .then(
                function good(_) {
                    return cleanup_expers_p(xids, 0);
                },
                function bad(err) {
                    return cleanup_expers_p(xids, 0)
                    .then(function(_) { throw err; });
               }
            );
        },

        testGet: function() {
            var ns = [3, 1, 2];
            var xids;

            function tg1_p(i) {
                if (i >= xids.length)
                    return null;
                return Experiments.get(xids[i])
                .then(function(exper) {
                    var a = test_exper_it(ns[i], xids[i], exper.type);
                    validate_exper_equal(a, exper, 'testGet ' + i);
                    return tg1_p(i + 1);
                });
            }

            return add_test_expers_p(ns)
            .then(function(ids) {
                xids = ids;
                return tg1_p(0);
            })
            .then(function(_) {
                return Experiments.get('Not-a-valid-id')
                .then(
                    function notsogood() {
                        // Good is bad; not supposed to work
                        console.log('testGet invalid id failure');
                        throw new Error('testGet invalid id failure');
                    },
                    function notsobad() {
                        // Bad is good
                        console.log('testGet invalid id success');
                        return null;
                    }
                );
            })
            .then(
                function good(_) {
                    return cleanup_expers_p(xids, 0);
                },
                function bad(err) {
                    return cleanup_expers_p(xids, 0)
                    .then(function(_) { throw err; });
               }
            );
        },

        testGetCurrent: function() {
            // In reverse chronological order these are ended(6),
            // active(5), active(2), abandoned(1).
            //
            var ns = [6, 2, 1, 5];
            var xids;

            return add_test_expers_p(ns)
            .then(function(ids) {
                xids = ids;
                return Experiments.getCurrent();
            })
            .then(function(exper) {
                // Should have resolved to test exper 5
                var a = test_exper_it(5, xids[3], exper.type);
                validate_exper_equal(a, exper, 'testGetCurrent 0');
                return Experiments.setStatus(xids[3], 'ended');
            })
            .then(function(_) {
                return Experiments.getCurrent();
            })
            .then(function(exper) {
                // Should have resolved to test exper 2
                var a = test_exper_it(2, xids[1], exper.type);
                validate_exper_equal(a, exper, 'testGetCurrent 1');
                return Experiments.setStatus(xids[1], 'abandoned');
            })
            .then(function(_) {
                return Experiments.getCurrent();
            })
            .then(function(exper) {
                // Should have resolved to null
                validate_exper_equal(null, exper, 'testGetCurrent 2');
            })
            .then(
                function good(_) {
                    return cleanup_expers_p(xids, 0);
                },
                function bad(err) {
                    return cleanup_expers_p(xids, 0)
                    .then(function(_) { throw err; });
               }
            );
        },

        testAdd: function() {
            var xbefore;
            var xids = [];

            return Experiments.all()
            .then(function(expers) {
                xbefore = expers;
                return add_test_expers_p([17]);
            })
            .then(function(ids) {
                xids[0] = ids[0];
                return Experiments.all();
            })
            .then(function(expers) {
                xbefore.push(test_exper_it(17, xids[0], expers[0].type));
                xbefore.sort(by_revchrono);
                validate_expers_equal(xbefore, expers, 'testAdd 0');
                return add_test_expers_p([31]);
            })
            .then(function(ids) {
                xids[1] = ids[0];
                return Experiments.all();
            })
            .then(function(expers) {
                xbefore.push(test_exper_it(31, xids[1], expers[0].type));
                xbefore.sort(by_revchrono);
                validate_expers_equal(xbefore, expers, 'testAdd 1');
                return null;
            })
            .then(
                function good(_) {
                    return cleanup_expers_p(xids, 0);
                },
                function bad(err) {
                    return cleanup_expers_p(xids, 0)
                    .then(function(_) { throw err; });
               }
            );
        },

        testSetStatus: function() {
            var xids;

            return add_test_expers_p([2]) // Active status
            .then(function(ids) {
                xids = ids;
                return Experiments.get(xids[0]);
            })
            .then(function(exper) {
                var a = test_exper_it(2, xids[0], exper.type);
                a.status = 'active'; // Just to be sure
                validate_exper_equal(a, exper, 'testSetStatus 0');
                return Experiments.setStatus(xids[0], 'ended');
            })
            .then(function(_) {
                return Experiments.get(xids[0]);
            })
            .then(function(exper) {
                var a = test_exper_it(2, xids[0], exper.type);
                a.status = 'ended'; // New status
                validate_exper_equal(a, exper, 'testSetStatus 1');
                return null;
            })
            .then(
                function good(_) {
                    return cleanup_expers_p(xids, 0);
                },
                function bad(err) {
                    return cleanup_expers_p(xids, 0)
                    .then(function(_) { throw err; });
               }
            );
        },

        testDelete: function() {
            // add experiment => id
            // get(id) => verify
            // delete(id)
            // get(id) => verify it's not there
            // clean up
            var xids;

            return add_test_expers_p([2])
            .then(function(ids) {
                xids = ids;
                return Experiments.get(xids[0]);
            })
            .then(function(exper) {
                var a = test_exper_it(2, xids[0], exper.type);
                validate_exper_equal(a, exper, 'testDelete 0');
                return Experiments.delete(xids[0]);
            })
            .then(function(_) {
                return Experiments.get(xids[0])
                .then(
                    function notsogood() {
                        // Good is bad; not supposed to work
                        console.log('testDelete deleted id failure');
                        throw new Error('testDelete deleted id failure');
                    },
                    function notsobad() {
                        // Bad is good
                        console.log('testDelete deleted id success');
                        return null;
                    }
                );
            })
            .then(
                function good(_) {
                    return cleanup_expers_p(xids, 0);
                },
                function bad(err) {
                    return cleanup_expers_p(xids, 0)
                    .then(function(_) { throw err; });
               }
            );
        }
    };
})

)
