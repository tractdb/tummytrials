// experiments.js     Experiments as Couchbase Lite documents
//

'use strict';

var DB_DOCVERSION = 1;
var DB_DOCTYPE = { name: 'activity', version: 1};
var DB_DATATYPE = {name: 'tummytrials_experiment', version: 1};

(angular.module('tummytrials.experiments', [])

/* The current type and version markings look like this:
 *
 *   docversion:  DB_DOCVERSION (above)
 *   doctype:     DB_DOCTYPE (above)
 *   datatype:    DB_DATATYPE (above)
 *
 * For now, assume that we don't know what to do with later versions, so
 * ignore such documents.
 *
 * These fields are managed by this service, not by callers.
 */

/* The following fields have a known meaning right now:
 *
 *   Activity properties:
 *     name:        Name of activity (string)
 *     start_time:  Start time (sec since 1970, start of first day)
 *     end_time:    Scheduled end time (sec since 1970, end of last day)
 *     status:      One of 'active', 'ended', 'abandoned'
 *
 *   Tummytrials experiment properties:
 *     comment:     Free form comment (string)
 *     symptoms:    Symptoms (array of string)
 *     trigger:     Trigger (string)
 *     remdescrs:   Reminder descriptors (array of object, see reminders.js)
 *     reports:     User reports (array of object, below)
 *     id:          Unique identifier 
 *
 * The id is created by this service, not supplied by callers. In fact
 * it's the CouchDB id of the document.
 *
 * Any other fields supplied by caller are preserved.
 */

/* A report might look something like this:
 *
 * {
 * type:           Report type
 * time:           Time of report (sec since 1970)
 * adherence:      Adhered to the experiment today (bool)
 * symptom_scores: (array of { name: string, score: number })
 * notes:          string
 * }
 *
 * But any fields supplied by caller are preserved. The 'type' field is
 * also used to coordinate reports with reminders (see reminders.js).
 */

.factory('Experiments', function($q, $http) {
    var LDB_NAME = 'experiments';
    var RDB_BASE = 'tractdb.org/couch/{USER}_tractdb';
    var RDB_URL = 'https://' + RDB_BASE;
    var RDB_UNPW_URL = 'https://{USER}:{PASS}@' + RDB_BASE;
    var cblurl = null;
    var db_is_initialized = false;
    var ddocs_are_initialized = false;
    var replication_prom = null;   // promise for replication

    function auth_hdr(unpw)
    {
        return 'Basic ' + btoa(unpw.username + ':' + unpw.password);
    }

    function cblurl_p()
    {
        // Return a promise that resolves to the url for Couchbase Lite.
        //
        var def = $q.defer();
        if (cblurl) {
            def.resolve(cblurl);
        } else {
            if (!window.cblite) {
                var msg = 'Couchbase Lite init error: no window.cblite';
                console.log(msg);
                def.reject(new Error(msg));
            } else {
                window.cblite.getURL(function(err, url) {
                    if (err) {
                        def.reject(err);
                    } else {
                        cblurl = url;
                        def.resolve(url);
                    }
                });
            }
        }
        return def.promise;
    }

    function initdb_p(cblurl)
    {
        // Return a promise to initialize the experiments DB. The
        // promise resolves to the URL of the DB.
        // 
        var dburl = cblurl + LDB_NAME;

        if (db_is_initialized) {
            var def = $q.defer();
            def.resolve(dburl);
            return def.promise;
        }

        return $http.put(dburl)
        .then(function good(resp) {
                  db_is_initialized = true;
                  return dburl;
              },
              function bad(resp) {
                  if (resp.status == 412) {
                      db_is_initialized = true;
                      return dburl; // Not really bad: DB exists already.
                  } else {
                      var msg = 'DB creation failed, status: ' + resp.status;
                      throw new Error(msg);
                  }
              }
        );
    }

    function initddocs_p(dburl)
    {
        // Return a promise to create some design documents in the DB.
        // The promise resolves to the URL of the DB.
        // 
        if (ddocs_are_initialized) {
            var def = $q.defer();
            def.resolve(dburl);
            return def.promise;
        }

        var ddocs = {
            language: 'javascript',
            views: { }, // Fill in below
            filters: {
                localddocs:
                    // Don't replicate local design documents.
                    //
                    "function(doc) {" +
                        "return doc._id.search(/^_design\\//) < 0;" +
                    "}"
            }
        };
        ddocs.views[DB_DATATYPE.name] = {
            map:
                "function(doc) { " +
                  "if (doc.docversion == " + DB_DOCVERSION + " && " +
                      "doc.doctype.name == '" + DB_DOCTYPE.name + "' && " +
                      "doc.doctype.version == " + DB_DOCTYPE.version + " && " +
                      "doc.datatype.name == '" + DB_DATATYPE.name + "' && " +
                      "doc.datatype.version == " + DB_DATATYPE.version + ")" +
                        "emit(doc.start_time, doc); " +
                "}"
        };

        // Delete any existing design documents and create new ones.
        // That way we know for sure what they are.
        //
        var ddocsurl = dburl + '/_design/ddocs';
        return $http.get(ddocsurl)
        .then(
            function exists(resp) {
                var ddocsrevurl = ddocsurl + '?rev=' + resp.data._rev;
                return $http.delete(ddocsrevurl);
            },
            function nosuch(resp) { return resp; } // Just continue, no delete
        )
        .then(function(_) {
            return $http.put(ddocsurl, ddocs);
        })
        .then(
            function good(resp) {
                ddocs_are_initialized = true;
                return dburl;
            },
            function bad(resp) {
                console.log('initddocs_p error:', resp.status);
                return dburl;
            }
        );
    }

    function init_p()
    {
        // Create and initialize the DB if necessary, resolving to its
        // URL.
        //
        return cblurl_p().then(initdb_p).then(initddocs_p);
    }

    function experiment_of_response(dburl, resp)
    {
        // Transform a DB response into an experiment.
        //
        var experiment = {};
        for (var p in resp)
            if (p.slice(0, 1) != '_')
                experiment[p] = resp[p];
        experiment.id = resp._id; // Expose internal _id as id
        return experiment;
    }

    function experiments_of_responserows(dburl, rows)
    {
        // (Caller warrants that the rows of the response are sorted
        // into the desired order.)
        //
        var docarray = [];

        rows.forEach(function(r) {
            docarray.push(experiment_of_response(dburl, r.value));
        });
        return docarray;
    }

    return {
        all: function() {
            // Return a promise for all the experiments.
            //
            var dburl;

            return init_p()
            .then(function(d) {
                dburl = d;
                var enturl = dburl + '/_design/ddocs/_view/' + DB_DATATYPE.name;
                // Reverse chronological by start time.
                //
                enturl += '?descending=true';
                return $http.get(enturl);
            })
            .then(
                function good(response) {
                    return experiments_of_responserows(dburl,
                                            response.data.rows);
                },
                function bad(response) {
                    var msg = 'Error retrieving experiments: ' +
                                response.statusText;
                    throw new Error(msg);
                }
            );
        },

        get: function(experimentId) {
            // Return a promise for the specified experiment.
            //
            var dburl;

            return init_p()
            .then(function(d) {
                dburl = d;
                return $http.get(dburl + '/' + experimentId);
            })
            .then(function(response) {
                return experiment_of_response(dburl, response.data);
            });
        },

        getCurrent: function() {
            // Return a promise for the current experiment, the active
            // experiment with the most recent start time. If there is
            // no active experiment, resolve to null.
            //
            var dburl;

            return init_p()
            .then(function(d) {
                dburl = d;
                var enturl = dburl + '/_design/ddocs/_view/' + DB_DATATYPE.name;
                // Reverse chronological by start time
                //
                enturl += '?descending=true';
                return $http.get(enturl);
            })
            .then(
                function good(response) {
                    var exps = experiments_of_responserows(dburl,
                                    response.data.rows);
                    for (var i = 0; i < exps.length; i++)
                        if (exps[i].status == 'active')
                            return exps[i];
                    return null;
                },
                function bad(response) {
                    var msg = 'Error retrieving experiments: ' +
                                response.statusText;
                    throw new Error(msg);
                }
            );
        },

        add: function(experiment) {
            // Return a promise to add the specified experiment. The
            // promise resolves to the id of the experiment.
            //
            var myexperiment = {};
            Object.getOwnPropertyNames(experiment).forEach(function(p) {
                myexperiment[p] = experiment[p];
            });
            myexperiment.docversion = DB_DOCVERSION;
            myexperiment.doctype = DB_DOCTYPE;
            myexperiment.datatype = DB_DATATYPE;

            var dburl;

            return init_p()
            .then(function(u) {
                dburl = u;
                return $http.post(dburl, myexperiment);
            })
            .then(
                function good(response) {
                    return response.data.id;
                },
                function bad(response) {
                  throw new Error('Experiment add failure: status ' +
                                      response.status);
                }
            );
        },

        setStatus: function(experimentId, newStatus) {
            // Return a promise to set the status of the experiment with
            // the given id. newStatus should be 'active', 'ended', or
            // 'abandoned'.
            //
            // The promise resolves to the new status.
            //
            var dburl;

            return init_p()
            .then(function(d) {
                dburl = d;
                return $http.get(dburl + '/' + experimentId);
            })
            .then(function(response) {
                response.data.status = newStatus;
                // (This works because response.data has _rev property.)
                //
                return $http.put(dburl + '/' + experimentId, response.data);
            })
            .then(function(response) {
                return newStatus;
            });
        },

        getRemdescrs: function(experimentId) {
            // Return a promise for the current reminder descriptors of
            // the experiment. See reminder.js for a definition of a
            // reminder descriptor.
            //
            var dburl;

            return init_p()
            .then(function(d) {
                dburl = d;
                return $http.get(dburl + '/' + experimentId);
            })
            .then(function(response) {
                return response.data.remdescrs || [];
            })
        },

        setRemdescrs: function(experimentId, newRemdescrs) {
            // Return a promise to set the reminder descriptors of the
            // experiment with the given id. See reminder.js for a
            // definition of reminder descriptors.
            //
            // The promise resolves to the new reminder descriptors.
            //
            var dburl;

            return init_p()
            .then(function(d) {
                dburl = d;
                return $http.get(dburl + '/' + experimentId);
            })
            .then(function(response) {
                response.data.remdescrs = newRemdescrs;
                // (This works because response.data has _rev property.)
                //
                return $http.put(dburl + '/' + experimentId, response.data);
            })
            .then(function(response) {
                return newRemdescrs;
            });
        },

        addReport: function(experimentId, report) {
            // Return a promise to add a report to the experiment with
            // the given id.
            //
            // The promise resolves to the updated number of reports.
            //
            var dburl;
            var newct;

            return init_p()
            .then(function(d) {
                dburl = d;
                return $http.get(dburl + '/' + experimentId);
            })
            .then(function(response) {
                if (!Array.isArray(response.data.reports))
                    // Ill formed experiment, not completely impossible.
                    response.data.reports = [];
                newct = response.data.reports.push(report);
                // (This works because response.data has _rev property.)
                //
                return $http.put(dburl + '/' + experimentId, response.data);
            })
            .then(function(response) {
                return newct;;
            });
        },

        delete: function(experimentId) {
            // Return a promise to delete the experiment with the given
            // id. The promise resolves to null.
            //
            var dburl;

            return init_p()
            .then(function(d) {
                dburl = d;
                return $http.get(dburl + '/' + experimentId);
            })
            .then(function(response) {
                var url = dburl + '/' + experimentId +
                            '?rev=' + response.data._rev;
                return $http.delete(url);
            })
            .then(function(response) {
                return null;
            });
        },

        valid_p: function(unpw) {
            // Return a promise to validate the given username and
            // password against the remote (central) DB. The promise
            // resolves to true if the credentials are valid, false if
            // not. The promise fails if validation can't be completed,
            // which is reasonably likely for a mobile app.
            //
            var req = { method: 'GET' };
            req.url = RDB_URL.replace(/{USER}/g, unpw.username);
            req.headers = { Authorization: auth_hdr(unpw) };
            return $http(req)
            .then(
                function good(resp) {
                    return true;
                },
                function bad(resp) {
                    if (resp.status == 0)
                        throw new Error('valid_p: no network');
                    else
                        return false;
                }
            );
        },

        replicate: function(unpw) {
            // Return a promise to start a bidirectional replication
            // process. If replication is already in progress, just
            // return the existing promise. The promise resolves to
            // null.
            //
            // Caller provides an object giving the username and
            // password for the CouchDB server. Currently we assume that
            // the database name is {USER}_tractdb.
            //
            if (replication_prom)
                return replication_prom;
            if (!unpw) {
                var def = $q.defer();
                def.resolve(null);
                return def.promise;
            }
            var rdbname = RDB_UNPW_URL.replace(/{USER}/g, unpw.username);
            rdbname = rdbname.replace(/{PASS}/g, unpw.password);

            var pushspec = { source: LDB_NAME, target: rdbname,
                             filter: 'ddocs/localddocs' };
            var pullspec = { source: rdbname, target: LDB_NAME };
            replication_prom =
                init_p()
                .then(function(dburl) {
                    var cblurl = dburl.replace(/[^/]*$/, '');
                    var pushp, pullp;
                    pushp = $http.post(cblurl + '_replicate', pushspec);
                    pullp = $http.post(cblurl + '_replicate', pullspec);
                    return $q.all([pushp, pullp]);
                })
                .then(
                    function(ra) {
                        replication_prom = null;
                        return null;
                    },
                    function(resp) {
                        console.log('replication error, status ', resp.status);
                        replication_prom = null;
                        return null;
                    }
                );
            return replication_prom;
        },

        replicating: function() {
            // Return true if replication is in progress, false
            // otherwise.
            //
            return !!replication_prom;
        },

        // Secret values used in testing.
        //
        _test_docversion: DB_DOCVERSION,
        _test_doctype: DB_DOCTYPE,
        _test_datatype: DB_DATATYPE
    };
})
);
