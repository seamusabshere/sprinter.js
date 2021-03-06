var assert = require('chai').assert,
    expect = require('chai').expect,
    mockNupicIssues = require('./mock-data/nupic-issues'),
    mockSprinterIssues = require('./mock-data/sprinter-issues'),
    mockNumentaMilestonesCreated = require('./mock-data/numenta-milestone-created'),
    mockRhyolightMilestonesCreated = require('./mock-data/rhyolight-milestone-created'),
    proxyquire = require('proxyquire');

describe('sprinter', function() {

    describe('when constructed', function() {
        var authenticated = false;
        var mockGitHubInstance = {
            authenticate: function(params) {
                assert.equal('basic', params.type, 'Missing GitHub auth type during authentication.');
                assert.equal('my-username', params.username, 'Missing GitHub username during authentication.');
                assert.equal('my-password', params.password, 'Missing GitHub password during authentication.');
                authenticated = true;
            }
        };

        var Sprinter = proxyquire('../sprinter', {
            'github': function () {
                return mockGitHubInstance;
            }
        });

        describe('without username', function() {
            it('throws proper error', function() {
                expect(function() {
                    new Sprinter(undefined, 'my-password');
                }).to.throw('Missing username.');
            });
        });

        describe('without password', function() {
            it('throws proper error', function() {
                expect(function() {
                    new Sprinter('my-username');
                }).to.throw('Missing password.');
            });
        });

        describe('without repos', function() {
            it('throws proper error', function() {
                expect(function() {
                    new Sprinter('my-username', 'my-password');
                }).to.throw('Missing repositories.');
            });
        });

        describe('with required configuration', function() {

            it('authenticates through GitHub', function() {
                new Sprinter('my-username', 'my-password', ['repo1','repo2']);
                assert.ok(authenticated, 'Sprinter did not authenticate upon construction.');
            });

        });

    });

    describe('when fetching issues', function() {
        var mockGitHubInstance = {
            authenticate: function() {},
            issues: {
                repoIssues: function(params, callback) {
                    expect(params).to.be.instanceOf(Object, 'GitHub client given no parameters.');
                    expect(params).to.have.keys(['user', 'repo', 'state'], 'GitHub params are missing data.');
                    assert.includeMembers(['numenta', 'rhyolight'], [params.user], 'Repo user should be either numenta or rhyolight.');
                    assert.includeMembers(['nupic', 'sprinter.js'], [params.repo], 'Repo name should be either nupic or sprinter.js.');
                    expect(params.state).to.equal('open', 'Default state filter was not "open".');
                    if (params.user == 'numenta' && params.repo == 'nupic') {
                        callback(null, mockNupicIssues);
                    } else if (params.user == 'rhyolight' && params.repo == 'sprinter.js') {
                        callback(null, mockSprinterIssues);
                    } else {
                        assert.fail('Unknown repo "' + params.user + '/' + params.repo + '".');
                    }
                }
            }
        };

        var Sprinter = proxyquire('../sprinter', {
            'github': function () {
                return mockGitHubInstance;
            }
        });

        it('fetches issues from all repos', function(done) {
            var sprinter = new Sprinter('user', 'pass', ['numenta/nupic','rhyolight/sprinter.js']);

            sprinter.getIssues(function(err, issues) {
                expect(err).to.not.exist;
                expect(issues).to.have.length(33, 'Wrong length of returned issues.');
                done();
            });
        });

    });

    describe('when creating milestones', function() {
        var mockGitHubInstance = {
            authenticate: function() {},
                issues: {
                    createMilestone: function(params, callback) {
                        expect(params).to.be.instanceOf(Object, 'GitHub client given no parameters.');
                        expect(params).to.have.keys(['user', 'repo', 'title', 'due_on'], 'GitHub params are missing data.');
                        assert.includeMembers(['numenta', 'rhyolight'], [params.user], 'Repo user should be either numenta or rhyolight.');
                        expect(params.repo).to.equal('experiments');
                        expect(params.title).to.equal('Test Milestone');
                        expect(params.due_on).to.equal('Apr 16, 2015');
                        if (params.user == 'rhyolight' && params.repo == 'experiments') {
                            callback(null, mockRhyolightMilestonesCreated);
                        } else if (params.user == 'numenta' && params.repo == 'experiments') {
                            callback(null, mockNumentaMilestonesCreated);
                        } else {
                            assert.fail('Unknown repo "' + params.user + '/' + params.repo + '".');
                        }
                    }
                }
        };

        var Sprinter = proxyquire('../sprinter', {
            'github': function () {
                return mockGitHubInstance;
            }
        });

        it('creates milestone on each repo', function(done) {
            var sprinter = new Sprinter('user', 'pass', ['numenta/experiments','rhyolight/experiments']);
            sprinter.createMilestones({
                title: 'Test Milestone',
                due_on: 'Apr 16, 2015'
            }, function(err, milestones) {
                expect(err).to.not.exist;
                expect(milestones).to.have.length(2, 'Wrong length of returned milestones.');
                done();
            });
        });

    });

});
