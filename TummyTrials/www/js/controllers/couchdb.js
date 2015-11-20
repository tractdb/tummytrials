// couchdb.js     TractDB interface to Couchbase Lite
//
// You can create an instance of the class CouchDB to access a db local
// to the app on the device. You can replicate to a db at tractdb.org,
// or you can let it stay a strictly local db.
// 
// To create a db you supply two things:
//
//   dbname     name for the db
//   typedescs  array of descriptions of the document types to be managed
//
// A type description looks like this:
//
//   { doctype: { name: (string), version: (integer) },
//     datatype: { name: (string), version: (integer) },
//     viewkeys: [ (string), ... ] // Names of key fields for views
//   }
//
// The viewkeys array is used to create simple views from the specified
// key fields.
//
// Example. TummyTrials has one type description like this:
//
//  {  doctype: { name: 'activity', version: 1 },
//     datatype: { name: 'tummytrials_experiment', version: 1 },
//     viewkeys: [ 'start_time' ]
//  }
//
// This creates a (local) view named tummytrials_experiment_by_start_time
// whose keys are start times and whose values are the documents
// themselves.
//
// To access documents through this view, call the get_all_p() method:
//
//   get_all_p(typedesc, 'start_time', { descending: true });
//
// The third parameter specifies query options.
//
// This module broadcasts an event (on the root scope) when replication
// is about to start, and another one after replication finishes:
//
//     couchdbBeforeReplicate
//     couchdbAfterReplicate
//

'use strict';

var DB_DOCVERSION = 1;

(angular.module('tractdb.couchdb', [])

.factory('CouchDB', function($ionicPlatform, $window, $rootScope, $q, $http) {
    var RDB_BASE = 'tractdb.org/couch/{USER}_{DBNAME}';
    var RDB_URL = 'https://' + RDB_BASE;
    var RDB_UNPW_URL = 'https://{USER}:{PASS}@' + RDB_BASE;
    var cblurl = null;  // Local URL for Couchbase Lite

    // Useful functions.
    //

    function platform_ready_p()
    {
        // Return a promise that the platform is ready. The promise
        // resolves to null.
        //
        var def = $q.defer();
        $ionicPlatform.ready(function() { def.resolve(null) });
        return def.promise;
    }

    function auth_hdr(unpw)
    {
        // Return contents of HTTP Authorization header.
        //
        return 'Basic ' + btoa(unpw.username + ':' + unpw.password);
    }

    function cblurl_p()
    {
        // Return a promise that resolves to the url for Couchbase Lite.
        //
        return platform_ready_p()
        .then(function(_) {
            if (cblurl)
                return cblurl;
            if (!$window.cblite) {
                var msg = 'Couchbase Lite init error: no $window.cblite';
                console.log(msg);
                throw (new Error(msg));
            }
            var def = $q.defer();
            $window.cblite.getURL(function(err, url) {
                if (err) {
                    def.reject(err);
                } else {
                    cblurl = url;
                    def.resolve(url);
                }
            });
            return def.promise;
        });
    }

    function viewname_of_typedesc(typedesc, viewkey)
    {
        // Return the name to use for the given document type
        // description and view key. An example view name is
        // 'tummytrials_experiment_by_start_time'.
        //
        return typedesc.datatype.name + "_by_" + viewkey;
    }

    function mapfun_of_typedesc(typedesc, viewkey)
    {
        // Return a map function (JavaScript source) for the given
        // document type description and view key. It's a simple view
        // for all documents matching the description (doctype and
        // datatype). Each key is the value of the field with the given
        // name. Each value is the document itself.
        //
        // Assume we can handle documents with versions less than or
        // equal to the ones in the type description.
        //
        var text =
            "function(doc) { " +
              "if (doc.docversion <= {DOCVERSION} && " +
                  "doc.doctype.name == '{DOCTYPE_NAME}' && " +
                  "doc.doctype.version <= {DOCTYPE_VERSION} && " +
                  "doc.datatype.name == '{DATATYPE_NAME}' && " +
                  "doc.datatype.version <= {DATATYPE_VERSION})" +
                    "emit(doc.{VIEW_KEY}, doc); " +
            "}";
        text = text.replace('{DOCVERSION}', DB_DOCVERSION);
        text = text.replace('{DOCTYPE_NAME}', typedesc.doctype.name);
        text = text.replace('{DOCTYPE_VERSION}', typedesc.doctype.version);
        text = text.replace('{DATATYPE_NAME}', typedesc.datatype.name);
        text = text.replace('{DATATYPE_VERSION}', typedesc.datatype.version);
        text = text.replace('{VIEW_KEY}', viewkey);
        return text;
    }

    function document_of_response(resp)
    {
        // Transform a DB response into a presentable document (one
        // without internal properties).
        //
        var document = {};
        for (var p in resp)
            if (p.slice(0, 1) != '_')
                document[p] = resp[p];
        document.id = resp._id; // Expose internal _id as id
        return document;
    }

    function documents_of_responserows(rows)
    {
        // (Caller warrants that the rows of the response are sorted
        // into the desired order.)
        //
        var docarray = [];

        rows.forEach(function(r) {
            docarray.push(document_of_response(r.value));
        });
        return docarray;
    }


    // Constructor.
    //

    function CouchDB(dbname, typedescs)
    {
        // dbname is the local name of the db. If the db is replicated,
        // it will be replicated against one with this name: username +
        // '_' + dbname. The expected name (for now) is 'tractdb'.
        //
        // typedescs is an array of descriptions of document types to be
        // managed. Each description looks like this:
        //
        // { doctype: { name: (string), version: (integer) },
        //   datatype: { name: (string), version: (integer) },
        //   viewkeys: [ (string), ... ] // Names of key fields for views
        // }
        //
        // CouchDB views can be arbitrary key/value pairs computed from
        // documents in the DB. For right now a view supported by this
        // module is very simple: for documents of a given type, the
        // value of any named field is the key, and the document itself
        // is the value. Field names to be used as keys for views are
        // listed in 'viewkeys'. For example, the key field for
        // TummyTrials experiments is 'start_time'.
        //
        this.dbname = dbname;
        this.typedescs = angular.copy(typedescs);
        this.db_is_initialized = false;
        this.ddocs_are_initialized = false;
        this.initialization_prom = null; // Promise for initialization
        this.replication_prom = null;    // Promise for replication
    }

    CouchDB.prototype = {};

    // Private instance methods.
    //

    CouchDB.prototype.initdb_p = function(cblurl) {
        // Return a promise to initialize the DB. The promise resolves
        // to the URL of the DB.
        // 
        var _this = this;

        var dburl = cblurl + this.dbname;

        if (this.db_is_initialized) {
            var def = $q.defer();
            def.resolve(dburl);
            return def.promise;
        }


        return $http.put(dburl)
        .then(function good(resp) {
                  _this.db_is_initialized = true;
                  return dburl;
              },
              function bad(resp) {
                  if (resp.status == 412) {
                      _this.db_is_initialized = true;
                      return dburl; // Not really bad: DB exists already.
                  } else {
                      var msg = 'DB creation failed, status: ' + resp.status;
                      throw new Error(msg);
                  }
              }
        );
    }

    CouchDB.prototype.initddocs_p = function(dburl) {
        // Return a promise to create local design documents in the DB.
        // The promise resolves to the URL of the DB.
        // 
        var _this = this;

        if (this.ddocs_are_initialized) {
            var def = $q.defer();
            def.resolve(dburl);
            return def.promise;
        }

        var ddocs = {
            language: 'javascript',
            views: { }, // Fill in below
            filters: {
                localddocs:
                    // Don't replicate local design documents for now.
                    //
                    "function(doc) {" +
                        "return doc._id.search(/^_design\\//) < 0;" +
                    "}"
            }
        };

        // Fill in views from type descriptions.
        //
        this.typedescs.forEach(function(tyd) {
            if (tyd.viewkeys)
                tyd.viewkeys.forEach(function(vk) {
                    ddocs.views[viewname_of_typedesc(tyd, vk)] =
                        { map: mapfun_of_typedesc(tyd, vk) };
                });
        });

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
                _this.ddocs_are_initialized = true;
                return dburl;
            },
            function bad(resp) {
                console.log('initddocs_p error:', resp.status);
                return dburl;
            }
        );
    }

    CouchDB.prototype.init_p = function() {
        // Return a promise to create and initialize the DB if
        // necessary, resolving to its URL.
        //
        var _this = this;
        if (this.initialization_prom)
            return this.initialization_prom;
        this.initialization_prom =
            cblurl_p()
            .then(function(url) {
                return _this.initdb_p(url);
            })
            .then(function(url) {
                return _this.initddocs_p(url);
            })
            .then(function(url) {
                _this.initialization_prom = null;
                return url;
            });
        return this.initialization_prom;
    }


    // Public instance methods.
    //

    CouchDB.prototype.get_all_p = function(typedesc, viewkey, opts) {
        // Return a promise for all the documents of the given type, as
        // retrieved by the given key. Specify any desired options in
        // opts. Example: { descending: true }
        //
        var optstr = '';

        if (Object(opts) == opts) {
            Object.getOwnPropertyNames(opts).forEach(function(p) {
                if (optstr != '')
                    optstr += '&';
                optstr += encodeURIComponent(p) + '=' +
                            encodeURIComponent(opts[p]);
            });
            if (optstr != '')
                optstr = '?' + optstr;
        }

        return this.init_p()
        .then(function(d) {
            var enturl = d + '/_design/ddocs/_view/' +
                            viewname_of_typedesc(typedesc, viewkey);
            enturl += optstr;
            return $http.get(enturl);
        })
        .then(
            function good(response) {
                return documents_of_responserows(response.data.rows);
            },
            function bad(response) {
                var msg = 'Error retrieving documents: ' +
                            response.statusText;
                throw new Error(msg);
            }
        );
    }

    CouchDB.prototype.get_p = function(id) {
        // Return a promise for the specified document.
        //
        return this.init_p()
        .then(function(d) { return $http.get(d + '/' + id); })
        .then(function(response) {
            return document_of_response(response.data);
        });
    }

    CouchDB.prototype.put_p = function(id, doc) {
        // Return a promise to store a new version of the specified
        // document. The promise resolves to null.
        //
        var dburl;

        return this.init_p()
        .then(function(d) {
            dburl = d;
            return $http.get(dburl + '/' + id);
        })
        .then(function(response) {
            doc._rev = response.data._rev;
            return $http.put(dburl + '/' + id, doc);
        })
        .then(function(response) {
            return null;
        });
    }

    CouchDB.prototype.add_p = function(typedesc, doc) {
        // Return a promise to add the given document as a new instance
        // of the given type description. The promise resolves to the id
        // assigned to the document.
        //
        var mydoc = {};
        Object.getOwnPropertyNames(doc).forEach(function(p) {
            mydoc[p] = doc[p];
        });
        mydoc.docversion = DB_DOCVERSION;
        mydoc.doctype = typedesc.doctype;
        mydoc.datatype = typedesc.datatype;

        return this.init_p()
        .then(function(d) {
            return $http.post(d, mydoc);
        })
        .then(
            function good(response) {
                return response.data.id;
            },
            function bad(response) {
              throw new Error('Document add failure: status ' +
                                  response.status);
            }
        );
    }

    CouchDB.prototype.delete_p = function(id) {
        // Return a promise to delete the document with the given id.
        // The promise resolves to null.
        //
        var dburl;

        return this.init_p()
        .then(function(d) {
            dburl = d;
            return $http.get(dburl + '/' + id);
        })
        .then(function(response) {
            var url = dburl + '/' + id + '?rev=' + response.data._rev;
            return $http.delete(url);
        })
        .then(function(response) {
            return null;
        });
    }

    CouchDB.prototype.valid_p = function(unpw) {
        // Return a promise to validate the given username and password
        // against the remote (central) DB. The promise resolves to true
        // if the credentials are valid, false if not. The promise fails
        // if validation can't be completed, which is reasonably likely
        // for a mobile app.
        //
        var req = { method: 'GET' };
        var url = RDB_URL.replace(/{USER}/g, unpw.username);
        req.url = url.replace(/{DBNAME}/g, this.dbname);
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
    }

    CouchDB.prototype.replicate_p = function(unpw) {
        // Return a promise to start a bidirectional replication
        // process. If replication is already in progress, just return
        // the existing promise. The promise resolves to null.
        //
        // Caller provides an object giving the username and password
        // for the CouchDB server. Currently we assume that the database
        // name is {USER}_{DBNAME}.
        //
        var _this = this;

        if (this.replication_prom)
            return this.replication_prom;
        if (!unpw) {
            var def = $q.defer();
            def.resolve(null);
            return def.promise;
        }
        var rdbname = RDB_UNPW_URL.replace(/{USER}/g, unpw.username);
        rdbname = rdbname.replace(/{PASS}/g, unpw.password);
        rdbname = rdbname.replace(/{DBNAME}/g, this.dbname);

        var pushspec = { source: this.dbname, target: rdbname,
                         filter: 'ddocs/localddocs' };
        var pullspec = { source: rdbname, target: this.dbname };

        $rootScope.$broadcast('couchdbBeforeReplicate');

        this.replication_prom =
            this.init_p()
            .then(function(dburl) {
                var cblurl = dburl.replace(/[^/]*$/, '');
                var pushp, pullp;
                pushp = $http.post(cblurl + '_replicate', pushspec);
                pullp = $http.post(cblurl + '_replicate', pullspec);
                return $q.all([pushp, pullp]);
            })
            .then(
                function(ra) {
                    $rootScope.$broadcast('couchdbAfterReplicate');
                    console.log('replication complete');
                    _this.replication_prom = null;
                    return null;
                },
                function(resp) {
                    $rootScope.$broadcast('couchdbAfterReplicate');
                    console.log('replication error, response ',
                        JSON.stringify(resp, null, 4));
                    _this.replication_prom = null;
                    return null;
                }
            );
        return this.replication_prom;
    }

    CouchDB.prototype.replicating = function() {
        // Return true if replication is in progress, false otherwise.
        //
        return !!this.replication_prom;
    }

    // Live long and prosper.
    //
    return CouchDB;
})
);
