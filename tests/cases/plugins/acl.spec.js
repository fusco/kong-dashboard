var HomePage = require('../../util/HomePage');
var Sidebar = require('../../util/Sidebar');
var PluginPage = require('../../util/PluginPage');
var ListPluginsPage = require('../../util/ListPluginsPage');
var KongDashboard = require('../../util/KongDashboard');
var Kong = require('../../util/KongClient');
var PropertyInput = require('../../util/PropertyInput');
var ObjectProperties = require('../../util/ObjectProperties');
var semver = require('semver');

var kd = new KongDashboard();

describe('Acl plugin testing:', () => {

  var api;

  beforeAll((done) => {
    kd.start({'--kong-url': 'http://127.0.0.1:8001'}, () => {
      Kong.deleteAllAPIs().then(() => {
        return createAPI();
      }).then((response) => {
        api = response;
        done();
      });
    });
  });

  afterAll((done) => {
    kd.stop(done);
  });

  beforeEach((done) => {
    Kong.deleteAllPlugins().then(done);
  });

  it('should successfully create acl plugin for All APIs', (done) => {
    HomePage.visit();
    Sidebar.clickOn('Plugins');
    ListPluginsPage.clickAddButton();
    var inputs = {
      'name': 'acl',
      'api_id': 'All',
      'config-blacklist': ['foo', 'bar']
    };
    if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
      inputs['config-hide_groups_header'] = true;
    }
    ObjectProperties.fillAndSubmit(inputs).then(() => {
      expect(element(by.cssContainingText('div.toast', 'Plugin saved!')).isPresent()).toBeTruthy();
      return Kong.getFirstPlugin();
    }).then((createdPlugin) => {
      expect(createdPlugin.name).toEqual('acl');
      expect(createdPlugin.api_id).toBeUndefined();
      if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
        expect(createdPlugin.config).toEqual({'blacklist': ['foo', 'bar'], 'hide_groups_header': true});
      } else {
        expect(createdPlugin.config).toEqual({'blacklist': ['foo', 'bar']});
      }

      // making sure form got reinitialized.
      expect(PropertyInput.getElement('config-blacklist').isPresent()).toBeFalsy();
      done();
    });
  });

  it('should successfully create acl plugin for one API', (done) => {
    HomePage.visit();
    Sidebar.clickOn('Plugins');
    ListPluginsPage.clickAddButton();
    var inputs = {
      'name': 'acl',
      'api_id': api.name,
      'config-whitelist': ['foo']
    };
    if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
      inputs['config-hide_groups_header'] = true;
    }
    ObjectProperties.fillAndSubmit(inputs).then(() => {
      expect(element(by.cssContainingText('div.toast', 'Plugin saved!')).isPresent()).toBeTruthy();
      return Kong.getFirstPlugin();
    }).then((createdPlugin) => {
      expect(createdPlugin.name).toEqual('acl');
      expect(createdPlugin.api_id).toEqual(api.id);
      if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
        expect(createdPlugin.config).toEqual({'whitelist': ['foo'], 'hide_groups_header': true});
      } else {
        expect(createdPlugin.config).toEqual({'whitelist': ['foo']});
      }
      done();
    });
  });

  it('should successfully create acl plugin for a service', (done) => {
    if (semver.lt(process.env.KONG_VERSION, '0.13.0')) {
      return done();
    }
    var service;
    Kong.deleteAllServices().then(() => {
      return Kong.createService({name: 'test_service', host: 'a.com'});
    }).then((s) => {
      service = s;
      HomePage.visit();
      Sidebar.clickOn('Plugins');
      ListPluginsPage.clickAddButton();
      var inputs = {
        'name': 'acl',
        'service_id': s.name,
        'config-whitelist': ['foo']
      };
      if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
        inputs['config-hide_groups_header'] = true;
      }
      return ObjectProperties.fillAndSubmit(inputs);
    }).then(() => {
      expect(element(by.cssContainingText('div.toast', 'Plugin saved!')).isPresent()).toBeTruthy();
      return Kong.getFirstPlugin();
    }).then((createdPlugin) => {
      expect(createdPlugin.name).toEqual('acl');
      expect(createdPlugin.service_id).toEqual(service.id);
      if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
        expect(createdPlugin.config).toEqual({'whitelist': ['foo'], 'hide_groups_header': true});
      } else {
        expect(createdPlugin.config).toEqual({'whitelist': ['foo']});
      }
      done();
    });
  });

  it('should successfully create acl plugin for a route', (done) => {
    if (semver.lt(process.env.KONG_VERSION, '0.13.0')) {
      return done();
    }
    var route;
    Kong.createService({name: 'service_with_route', host: 'a.com'}).then((service) => {
      return Kong.deleteAllRoutes().then(() => {
        return Kong.createRoute({
          service: {id: service.id},
          methods: ['GET']
        });
      })
    }).then((r) => {
      route = r;
      HomePage.visit();
      Sidebar.clickOn('Plugins');
      ListPluginsPage.clickAddButton();
      var inputs = {
        'name': 'acl',
        'route_id': route.id,
        'config-whitelist': ['foo']
      };
      if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
        inputs['config-hide_groups_header'] = true;
      }
      return ObjectProperties.fillAndSubmit(inputs);
    }).then(() => {
      expect(element(by.cssContainingText('div.toast', 'Plugin saved!')).isPresent()).toBeTruthy();
      return Kong.getFirstPlugin();
    }).then((createdPlugin) => {
      expect(createdPlugin.name).toEqual('acl');
      expect(createdPlugin.route_id).toEqual(route.id);
      if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
        expect(createdPlugin.config).toEqual({'whitelist': ['foo'], 'hide_groups_header': true});
      } else {
        expect(createdPlugin.config).toEqual({'whitelist': ['foo']});
      }
      done();
    });
  });

  it('should be possible to edit a previously created acl plugin', (done) => {
    Kong.createPlugin({
      name: 'acl',
      config: {blacklist: ['foo', 'bar']}
    }).then((createdPlugin) => {
      PluginPage.visit(createdPlugin.id);
      var inputs = {
        'config-blacklist': '',
        'config-whitelist': ['admin']
      };
      return ObjectProperties.fillAndSubmit(inputs);
    }).then(() => {
      expect(element(by.cssContainingText('div.toast', 'Plugin saved!')).isPresent()).toBeTruthy();
      return Kong.getFirstPlugin();
    }).then((updatedPlugin) => {
      expect(updatedPlugin.name).toEqual('acl');
      expect(updatedPlugin.api_id).toBeUndefined();
      if (semver.satisfies(process.env.KONG_VERSION, '>= 0.14.0')) {
        expect(updatedPlugin.config).toEqual({'whitelist': ['admin'], 'blacklist': {}, 'hide_groups_header': false});
      } else {
        expect(updatedPlugin.config).toEqual({'whitelist': ['admin'], 'blacklist': {}});
      }
      done();
    });
  });

  function createAPI() {
    if (semver.satisfies(process.env.KONG_VERSION, '0.9.x')) {
      return Kong.createAPI({
        'name': 'api_for_acl',
        'request_path': '/api_for_acl',
        'upstream_url': 'http://foo'
      });
    }

    if (semver.satisfies(process.env.KONG_VERSION, '>=0.10.0 < 0.15.0')) {
      return Kong.createAPI({
        name: 'api_for_acl',
        hosts: ['host1.com', 'host2.com'],
        uris: ['/1.0', '/2.0'],
        methods: ['GET', 'POST'],
        upstream_url: 'http://upstream.loc',
      });
    }

    throw new Error('Kong version not supported in unit tests.')
  }
});
