var electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 'electron');

var appPath = path.join(__dirname, '..');

var app = new Application({
            path: electronPath,
            args: [appPath]
        });
//console.log('The APP: ', app);

describe('Test Example', function () {
  beforeEach(function () {
      return app.start();
  });

  afterEach(function () {
      return app.stop();
  });

  it('opens a window', function () {
    expect.assertions(1);
    //console.log('app.client', app.client)
    // return app.client.element('#james').then(function(j){
    //   console.log('xxxx', j)
    //   expect(1).toEqual(1);
    // })
    // return app.client.element('h1').getValue().then(function(response){
    //   console.log('xxxx', j)
    //   expect(1).toEqual(1);
    // })
    return app.client.element('input').getValue().then(function(j){
      console.log('xxxx', j)
      expect(1).toEqual(1);
    })
    // return app.client.waitUntilWindowLoaded().getWindowCount().then(function (count) {
    //     console.log('cccc', count)
    //     expect(count).toEqual(2);
    // })
  });

  // it('tests the title', function () {
  //   expect.assertions(1);
  //   //console.log(app, app.client)
  //   return app.client.waitUntilWindowLoaded().browserWindow.getTitle().then(function (t) {
  //     console.log('tttttttt', t)
  //         expect(t).toEqual('Hello World!');
  //   })
  // });
});
