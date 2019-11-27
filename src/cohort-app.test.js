// Copyright Jacob Niedzwiecki, 2019
// Released under the MIT License (see /LICENSE)

const request = require('supertest')
const uuid = require('uuid/v4')
const knex = require('./knex/knex')
const moment = require('moment')

// for websocket tests only
const ws = require('ws')

const CHSession = require('./models/CHSession')

var app
process.env.NODE_ENV = 'test'

beforeEach( async () => {
  console.log('global beforeEach()')
  await knex.migrate.rollback()
  await knex.migrate.latest()
  await knex.seed.run()

  app = require('./cohort-app')
  await CHSession.initAndSetOnApp(app).then( () => {
    // console.log("starting cohort session")
  })
})

afterEach( async () => {
  console.log('global afterEach()')
  await knex.migrate.rollback()
  // per issue #12, we should actually tear down the app/server here
  app.set('cohort', null)
})

afterAll( async () => {
  console.log("global afterAll")
  await knex.destroy()
})

/* 
 *    UTILITY METHODS
 */

beforeAll( () => {
  // createDevice = (guid, tags) => {
  //   let payload = { guid: guid }
  //   if(tags !== undefined){
  //     payload.tags = tags
  //   }
  //   return request(app)
  //     .post('/api/v1/devices')
  //     .send(payload)
  // }
})



/*
 *    BASIC TESTS
 */

describe('Basic startup', () => {
  test('the app inits', async () => {
    const res = await request(app).get('/api/v2')
    expect(res.status).toEqual(200)
    expect(res.text).toEqual('Cohort rocks')
  })
  test('the app inits a second time', async () => {
    const res = await request(app).get('/api/v2')
    expect(res.status).toEqual(200)
    expect(res.text).toEqual('Cohort rocks')
  })
})


/*
 *    EVENT ROUTES
 */

 describe('Event routes', () => {
  test('GET /events', async () => {
    const res = await request(app).get('/api/v2/events')
    expect(res.status).toEqual(200)
    expect(res.body).toHaveLength(5)

    expect(res.body[0]).toHaveProperty('label')
    expect(res.body[0].label).toEqual('pimohtēwak')

    expect(res.body[1]).toHaveProperty('label')
    expect(res.body[1].label).toEqual('lot_x')

    expect(res.body[3]).toHaveProperty('occasions')
    expect(res.body[3].occasions).toHaveLength(2)
    expect(res.body[3].occasions[0]).toHaveProperty('label')
    expect(res.body[3].occasions[0].label).toEqual('Show 1')

  })

  test('GET /events/:id', async () => {
    // event that doesn't have any occasions
    const res1 = await request(app).get('/api/v2/events/1')
    expect(res1.status).toEqual(200)

    expect(res1.body).toHaveProperty('id')
    expect(res1.body.id).toEqual(1)
    expect(res1.body).toHaveProperty('label')
    expect(res1.body.label).toEqual('pimohtēwak')

    //event that has occasions
    const res2 = await request(app).get('/api/v2/events/2')
    expect(res2.status).toEqual(200)

    expect(res2.body).toHaveProperty('occasions')
    expect(res2.body.occasions).toHaveLength(3)
    expect(res2.body.occasions[0].state).toEqual('opened')
  })

  test('GET /events/:id : error: event not found', async () => {
    const res = await request(app).get('/api/v2/events/99')
    expect(res.status).toEqual(404)

    expect(res.text).toEqual("Error: event with id:99 not found")
  })

  test('POST /events', async () =>{
    const res = await request(app)
      .post('/api/v2/events')
      .send({ label: 'new event' })

    expect(res.status).toEqual(201)
    expect(res.header.location).toEqual('/api/v2/events/6')
    expect(res.body).toHaveProperty('id')
    expect(res.body.id).toEqual(6)
    expect(res.body.label).toEqual('new event')
  })

  test('DELETE /events/:id', async () => {
    const res = await request(app)
      .delete('/api/v2/events/2')
    expect(res.status).toEqual(204)

    const res2 = await request(app).get('/api/v2/events/2')
    expect(res2.status).toEqual(404)
  })

  // test('DELETE /events/:id -- error: open event cannot be deleted', async () =>{
  //   const res = await request(app)
  //     .delete('/api/v1/events/4')
  //   expect(res.status).toEqual(403)

  //   const res2 = await request(app).get('/api/v1/events/4')
  //   expect(res2.status).toEqual(200)
  // })

  // // should always have occasion
  // // test('GET /events/:eventId/devices', async () => {
  // //   const res = await request(app)
  // //     .get('/api/v1/events/3/devices')

  // //   expect(res.status).toEqual(200)
  // //   expect(res.body).toHaveLength(3)
  // // })

  // test('GET /events/:eventId/occasions/:occasionId/devices', async () => {
  //   const res = await request(app)
  //     .get('/api/v1/events/4/occasions/1/devices')

  //   expect(res.status).toEqual(200)
  //   expect(res.body).toHaveLength(1)
  // })

  // // happy path
  // test('PATCH /events/:eventId/occasions/:occasionId/check-in', async () => {
  //   const getDevicesEndpoint = '/api/v1/events/4/occasions/1/devices'
  //   const res1 = await request(app).get(getDevicesEndpoint)
  //   expect(res1.status).toEqual(200)
  //   const deviceCount = res1.body.length

  //   // this device already exists in the DB
  //   // in a full flow, we would create the device at POST /devices first
  //   // yeah it's a bit much
  //   const res2 = await request(app)
  //     .patch('/api/v1/events/4/occasions/1/check-in')
  //     .send({ guid: "1234567" })

  //   console.log(res2.body)
  //   expect(res2.status).toEqual(200)

  //   const eventsTable = require('./knex/queries/event-queries')
  //   let devices = await eventsTable.getDevicesForEventOccasion(4,1)
  //   // expect(devices.length).toEqual(2)
    
  //   // expect(res2.body).toHaveProperty('id')
  //   // expect(res2.body.id).toEqual(1)

  //   const res3 = await request(app).get(getDevicesEndpoint)
  //   expect(res3.body).toHaveLength(deviceCount+1)
  // })

  // test('PATCH /events/:eventId/check-in => occasion check-in -- error: device is already checked in', async () => {
  //   const eventId = 4
  //   const deviceId = 1
  //   const occasionId = 1

  //   const res1 = await request(app).get('/api/v1/events/' + eventId + '/devices')
  //   expect(res1.status).toEqual(200)
  //   const deviceCount = res1.body.length
  //   // check into event
    
  //   const res2 = await request(app)
  //     .patch('/api/v1/events/' + eventId + '/check-in')
  //     .send({ guid: "1234567" }) // this device already exists in the DB
  //   expect(res2.status).toEqual(200)
  //   expect(res2.body).toHaveProperty('id')
  //   expect(res2.body.id).toEqual(4)

  //   // verify event check-in
  //   const getDevicesEndpoint = '/api/v1/events/' + eventId + '/devices'
  //   const res3 = await request(app).get(getDevicesEndpoint)
  //   expect(res3.status).toEqual(200)
  //   const deviceCountAfterEventCheckin = res3.body.length
  //   expect(deviceCountAfterEventCheckin).toEqual(deviceCount + 1)

  //   // now check into occasion
  //   const res4 = await request(app)
  //     .patch('/api/v1/events/' + eventId + '/occasions/' + occasionId + '/check-in')
  //     .send({ guid: "1234567" })

  //   console.log(res4.body)
  //   expect(res4.status).toEqual(200)

  //   const eventsDevicesTable = knex('events_devices')

  //   const eventDeviceRelations = await eventsDevicesTable
  //     .where('event_id', eventId)
  //     .where('device_id', deviceId)
    
  //   console.log(eventDeviceRelations)
  //   expect(eventDeviceRelations.length).toEqual(1)
  //   expect(eventDeviceRelations[0].occasion_id).toEqual(1)

  //   // now check in to event again
  //   const res5 = await request(app)
  //     .patch('/api/v1/events/' + eventId + '/check-in')
  //     .send({ guid: "1234567" })

  //   console.log(res5.body)
  //   expect(res5.status).toEqual(200)
  // })

  // // happy path for checking into an open event


  // test('PATCH /events/:id/check-in -- error: device guid not found', async () => {
  //   const guid = "foo"
  //   const res = await request(app)
  //     .patch('/api/v1/events/1/check-in')
  //     .send({ guid: guid })

  //   expect(res.status).toEqual(404)
  //   expect(res.text).toEqual("Error: no device found with guid:foo")
  // })  
  
  // test('PATCH /events/:id/check-in -- error: no guid included in request', async () => {
  //   const res = await request(app)
  //     .patch('/api/v1/events/1/check-in')
  //     .send({ foo: "bar" })

  //   expect(res.status).toEqual(400)
  //   expect(res.text).toEqual("Error: request must include a device guid")
  // })

  // // should always have occasion
  // test('PATCH /events/:id/check-in -- error: invalid event id', async () => {
  //   const res = await request(app)
  //     .patch('/api/v1/events/99/check-in')
  //     .send({ guid: "1234567" })

  //   expect(res.status).toEqual(404)
  //   expect(res.text).toEqual("Error: no event found with id:99")
  // })

  // test('PATCH /events/:id/open', async () => {
  //   let consoleOutput = "";
  //   storeLog = inputs => (consoleOutput += inputs)

  //   console["log"] = jest.fn(storeLog)
  //   expect(app.get("cohort").events.length).toEqual(2)
  //   const res = await request(app)
  //     .patch('/api/v1/events/2/open')
    
  //   expect(res.status).toEqual(200)
  //   expect(res.body.state).toEqual('open')
  //   expect(app.get("cohort").events.length).toEqual(3)
  //   expect(consoleOutput).toEqual("event lot_x is now open")
  // })

  // test('PATCH /events/:id/close', async () => {
  //   expect(app.get("cohort").events.length).toEqual(2)
  //   const res = await request(app)
  //     .patch('/api/v1/events/3/close')
    
  //   expect(res.status).toEqual(200)
  //   expect(res.body.state).toEqual('closed')
  //   expect(app.get("cohort").events.length).toEqual(1)
  // })

  // test('PATCH /events/:id/open and /close', async () => {
  //   let consoleOutput = "";
  //   storeLog = inputs => (consoleOutput += inputs)

  //   console["log"] = jest.fn(storeLog)
  //   expect(app.get("cohort").events.length).toEqual(2)
  //   const res1 = await request(app)
  //     .patch('/api/v1/events/2/open')
    
  //   expect(res1.status).toEqual(200)
  //   expect(res1.body.state).toEqual('open')
  //   expect(app.get("cohort").events.length).toEqual(3)
  //   expect(consoleOutput).toEqual("event lot_x is now open")

  //   // next close it

  //   expect(app.get("cohort").events.length).toEqual(3)
  //   const res2 = await request(app)
  //     .patch('/api/v1/events/2/close')
    
  //   expect(res2.status).toEqual(200)
  //   expect(res2.body.state).toEqual('closed')
  //   expect(app.get("cohort").events.length).toEqual(2)
  //   expect(consoleOutput).toEqual("event lot_x is now openevent lot_x is now closed")

  //   // now re-open it
  //   const res3 = await request(app)
  //     .patch('/api/v1/events/2/open')
    
  //   expect(res3.status).toEqual(200)
  //   expect(res3.body.state).toEqual('open')
  //   expect(app.get("cohort").events.length).toEqual(3)
  //   expect(consoleOutput).toEqual("event lot_x is now openevent lot_x is now closedevent lot_x is now open")

  //   // now close it once more
  //   const res4 = await request(app)
  //     .patch('/api/v1/events/2/close')
    
  //   expect(res4.status).toEqual(200)
  //   expect(res4.body.state).toEqual('closed')
  //   expect(app.get("cohort").events.length).toEqual(2)
  //   expect(consoleOutput).toEqual("event lot_x is now openevent lot_x is now closedevent lot_x is now openevent lot_x is now closed")
  // })

  // // should always have occasion
  // test('POST /events/:id/broadcast: error -- no devices connected', async () => {
  //   const cohortMessage = {
  //     targetTags: ["all"],
	//     mediaDomain: "sound",
	//     cueNumber: 1,
	//     cueAction: "play"
  //   }

  //   const res = await request(app)
  //     .post('/api/v1/events/3/broadcast')
  //     .send(cohortMessage)

  //   expect(res.status).toEqual(403)
  //   expect(res.text).toEqual("Warning: No devices are connected via WebSockets, broadcast was not sent")
  // })

  // test('POST /events/:eventId/occasions/:occasionId/broadcast-push-notification', async () => {
  //   const eventsTable = require('./knex/queries/event-queries')
  //   getDevicesForEventOccasion(4, 1).then( devices => {
  //     console.log(devices)
  //     expect(devices.length).toEqual(1)
  //   })
  // })

  // test('POST /events/:eventId/occasions', async () => {
  //   const payload = { 
  //     "doorsOpenDateTime": "2019-02-09T16:00:00-05:00",
  //     "endDateTime": "2019-02-09T18:00:00-05:00",
  //     "locationCity": "Cupertino",
  //     "locationAddress": "One Infinite Loop",
  //     "locationLabel": "Apple Park",
  //     "startDateTime": "2019-02-09T15:30:00-05:00"
  //   }

  //   const res = await request(app)
  //     .post('/api/v1/events/2/occasions')
  //     .send(payload)

  //   expect(res.status).toEqual(201)
  //   expect(res.body.event_id).toEqual("2")
  //   expect(res.body.id).toBeDefined()
  //   expect(res.body.locationCity).toEqual("Cupertino")
  // })

  // test('GET /events/:eventId/occasions/:occasionId/upcoming', async () => {
  //   const yesterdaysDate = moment().subtract(1, 'days').format("YYYY-MM-DD")
  //   const todaysDate = moment().format("YYYY-MM-DD")

  //   const payload = { 
  //     "doorsOpenDateTime": todaysDate + "T16:00:00-05:00",
  //     "endDateTime": todaysDate + "T18:00:00-05:00",
  //     "locationCity": "Cupertino",
  //     "locationAddress": "One Infinite Loop",
  //     "locationLabel": "Apple Park",
  //     "startDateTime": todaysDate + "T15:30:00-05:00"
  //   }

  //   const res1 = await request(app)
  //     .post('/api/v1/events/2/occasions')
  //     .send(payload)

  //   expect(res1.status).toEqual(201)
  //   expect(res1.body.event_id).toEqual("2")
  //   expect(res1.body.id).toBeDefined()
  //   expect(res1.body.locationCity).toEqual("Cupertino")

  //   const payload2 = { 
  //     "doorsOpenDateTime": yesterdaysDate + "T16:00:00-05:00",
  //     "endDateTime": yesterdaysDate + "T18:00:00-05:00",
  //     "locationCity": "Cupertino",
  //     "locationAddress": "One Infinite Loop",
  //     "locationLabel": "Apple Park",
  //     "startDateTime": yesterdaysDate + "T15:30:00-05:00"
  //   }

  //   const res2 = await request(app)
  //     .post('/api/v1/events/2/occasions')
  //     .send(payload2)

  //   expect(res2.status).toEqual(201)
  //   expect(res2.body.event_id).toEqual("2")
  //   expect(res2.body.id).toBeDefined()
  //   expect(res2.body.locationCity).toEqual("Cupertino")

  //   const res3 = await request(app)
  //     .get('/api/v1/events/2/occasions/upcoming?onOrAfterDate=' + todaysDate)

  //   expect(res3.status).toEqual(200)
  //   expect(res3.body).toHaveLength(1)
  //   expect(res3.body[0].locationLabel).toEqual("Apple Park")
  //   expect(res3.body[0].locationCity).toEqual("Cupertino")

  // })

  // test('GET /events/:eventId/occasions/:occasionId/upcoming -- edge case: event late in day', async () => {
  //   const todaysDate = moment().format("YYYY-MM-DD")

  //   const payload = { 
  //     "doorsOpenDateTime": todaysDate + "T22:50:00-05:00",
  //     "endDateTime": todaysDate + "T23:50:00-05:00",
  //     "locationCity": "Cupertino",
  //     "locationAddress": "One Infinite Loop",
  //     "locationLabel": "Apple Park",
  //     "startDateTime": todaysDate + "T23:00:00-05:00"
  //   }

  //   const res1 = await request(app)
  //     .post('/api/v1/events/2/occasions')
  //     .send(payload)

  //   expect(res1.status).toEqual(201)
  //   expect(res1.body.event_id).toEqual("2")
  //   expect(res1.body.id).toBeDefined()
  //   expect(res1.body.locationCity).toEqual("Cupertino")

  //   const res2 = await request(app)
  //     .get('/api/v1/events/2/occasions/upcoming?onOrAfterDate=' + todaysDate)

  //   expect(res2.status).toEqual(200)
  //   expect(res2.body).toHaveLength(1)
  //   expect(res2.body[0].locationLabel).toEqual("Apple Park")
  //   expect(res2.body[0].locationCity).toEqual("Cupertino")
  // })

  // test('GET /events/:eventId/occasions/:occasionId/upcoming -- edge case: event early in day', async () => {
  //   const todaysDate = moment().format("YYYY-MM-DD")

  //   const payload = { 
  //     "doorsOpenDateTime": todaysDate + "T00:50:00-05:00",
  //     "endDateTime": todaysDate + "T02:00:00-05:00",
  //     "locationCity": "Cupertino",
  //     "locationAddress": "One Infinite Loop",
  //     "locationLabel": "Apple Park",
  //     "startDateTime": todaysDate + "T01:00:00-05:00"
  //   }

  //   const res1 = await request(app)
  //     .post('/api/v1/events/2/occasions')
  //     .send(payload)

  //   expect(res1.status).toEqual(201)
  //   expect(res1.body.event_id).toEqual("2")
  //   expect(res1.body.id).toBeDefined()
  //   expect(res1.body.locationCity).toEqual("Cupertino")

  //   const res2 = await request(app)
  //     .get('/api/v1/events/2/occasions/upcoming?onOrAfterDate=' + todaysDate)

  //   expect(res2.status).toEqual(200)
  //   expect(res2.body).toHaveLength(1)
  //   expect(res2.body[0].locationLabel).toEqual("Apple Park")
  //   expect(res2.body[0].locationCity).toEqual("Cupertino")
  // })
})

/*
 *    OCCASION ROUTES
 */

describe('Occasion routes', () => {
  test('POST /occasions -- error: eventId not included', async () => {
    const res = await request(app)
      .post('/api/v2/occasions')
      .send({ 
        label: 'new occasion'
      })

    expect(res.status).toEqual(400)
    expect(res.text).toEqual('Error: request must include an existing event id (as "eventId" property)')
  })

  test('POST /occasions -- error: event for occasion does not exist', async () => {
    const res = await request(app)
      .post('/api/v2/occasions')
      .send({ 
        label: 'new occasion', 
        eventId: 99 
      })

    expect(res.status).toEqual(404)
    expect(res.text).toEqual('Error: event with id:99 not found. To create an occasion, you must include an eventId property corresponding to an existing event.')
  })

  test('POST /occasions -- happy path', async () => {
    const res = await request(app)
      .post('/api/v2/occasions')
      .send({ 
        label: 'new occasion', 
        eventId: 1
      })

    expect(res.status).toEqual(201)
    expect(res.header.location).toEqual('/api/v2/occasions/6')
    expect(res.body).toHaveProperty('id')
    expect(res.body.id).toEqual(6)
    expect(res.body.label).toEqual('new occasion')
  })

  test('DELETE /occasions -- error: occasion not found', async () => {
    const res = await request(app)
      .delete('/api/v2/occasions/99')

    expect(res.status).toEqual(404)
  })

  test('DELETE /occasions -- error: opened occasion cannot be deleted', async () => {
    const res = await request(app)
      .delete('/api/v2/occasions/3')

      expect(res.status).toEqual(400)
      expect(res.text).toEqual('Error: an opened occasion cannot be deleted. Close the occasion and try again.')
  })

  test('DELETE /occasions -- happy path', async () => {
    numberOfOccasions = async () => {
      const res = await request(app).get('/api/v2/events')
      expect(res.status).toEqual(200)
      
      let occasions = []
      for(event of res.body){
        if(event.occasions){
          occasions.push(...event.occasions)
        }
      }

      return occasions.length
    }

    let occasionsCount = await numberOfOccasions()

    const res1 = await request(app)
      .delete('/api/v2/occasions/1')

    expect(res1.status).toEqual(204)

    // verify that the number of occasions has gone down by one
    let newOccasionsCount = await(numberOfOccasions())
    expect(newOccasionsCount).toEqual(occasionsCount - 1)
  })

  test('PATCH /occasions/:id -- open occasion', async () =>{
    const res = await request(app)
      .patch('/api/v2/occasions/2')
      .send({state: 'opened'})

    expect(res.status).toEqual(200)
    expect(res.body.id).toEqual(2)
    expect(res.body.state).toEqual('opened')
    expect(app.get('cohortSession').openOccasions).toHaveLength(2)
  })

  test('PATCH /occasions/:id -- close occasion', async () =>{
    const res = await request(app)
      .patch('/api/v2/occasions/3')
      .send({state: 'closed'})

    expect(res.status).toEqual(200)
    expect(res.body.id).toEqual(3)
    expect(res.body.state).toEqual('closed')
    expect(app.get('cohortSession').openOccasions).toHaveLength(0)
  })
})




  




  // test('new socket client can connect -- error: timeout for Cohort handshake', async (done) => {
  //   const webSocketServer = require('./cohort-websockets')({
  //     app: app, server: server, path: '/sockets'
  //   })

  //   expect(webSocketServer).toBeDefined()

  //   const wsClient = new ws(socketURL)

  //   wsClient.addEventListener('open', event => {
  //     expect(webSocketServer.clients.size).toEqual(1)
  //     wsClient.addEventListener('message', message => {
  //       expect(message).toEqual('Cohort handshake failed, closing socket')
  //       expect(webSocketServer.clients.size).toEqual(0)
  //       done()
  //     })
  //   })
  // })
// })

//

//   // test('new socket client can connect -- error: bad Cohort handshake', async (done) =>{
//   //   const webSocketServer = require('./cohort-websockets')({
//   //     app: app, server: server, path: '/sockets'
//   //   })

//   //   expect(webSocketServer).toBeDefined()

//   //   const wsClient = new ws(socketURL)

//   //   wsClient.addEventListener('open', event => {
//   //     // expect(webSocketServer.clients) to be 1 now
//   //   })
//   // })

//   // test bad JSON - throw error
// })

//   test('startup & new connection', async (done) => {
//     expect(app.get("cohort").events[0].devices.length).toEqual(3)

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })

//     expect(webSocketServer).toBeDefined()

//     const wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {
//       expect(wsClient.readyState).toEqual(1)
//       done()
//     })
//   })

//   test('send message: error -- json parse error', async (done) => {
//     expect.assertions(3)

//     expect(app.get("cohort").events[0].devices.length).toEqual(3)

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })

//     expect(webSocketServer).toBeDefined()

//     const wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {

//       wsClient.addEventListener('message', message => {
//         const msg = JSON.parse(message.data)
//         expect(msg.error).toEqual("message is not valid JSON (Unexpected string in JSON at position 9)")
//         done()
//       })

//       let badJSONString = '{\"blep:\" \"blop\"}'
//       wsClient.send(badJSONString)
//     })
//   })

// test('initial handshake: error -- no guid included', async(done) => {
//     const eventId = 3

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })

//     expect(webSocketServer).toBeDefined()

//     const wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {
//       let guid = uuid()
//       wsClient.send(JSON.stringify({ eventId: eventId }))
//     })

//     wsClient.addEventListener('close', error => {
//       expect(error.code).toEqual(4003)
//       expect(error.reason).toEqual("First message from client must include fields 'guid' and 'eventId'")
//       done()
//     })
//   })

// test('initial handshake: error -- event not found', async(done) => {
//     const eventId = 100

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })

//     expect(webSocketServer).toBeDefined()

//     const wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {
//       let guid = uuid()
//       wsClient.send(JSON.stringify({ guid: guid, eventId: eventId }))
//     })

//     wsClient.addEventListener('close', error => {
//       expect(error.code).toEqual(4002)
//       expect(error.reason).toEqual('No open event found with id:' + eventId)
//       done()
//     })
//   })

//   test('initial handshake: error -- device not checked in to event', async(done) => {
//     const eventId = 3

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })

//     expect(webSocketServer).toBeDefined()

//     const wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {
//       let guid = uuid()
//       wsClient.send(JSON.stringify({ guid: guid, eventId: eventId }))
//     })

//     wsClient.addEventListener('close', error => {
//       expect(error.code).toEqual(4000)
//       expect(error.reason).toEqual("Devices must be registered via HTTP before opening a WebSocket connection")
//       done()
//     })
//   })

//   test('initial handshake: happy path', async (done) => {
//     const eventId = 3

//     /* 
//        this device is already created and checked in 
//        in a full flow, we would:
//      - POST /devices with {guid: 'whatever'} to create the device
//      - PATCH /events/3/check-in with {guid: 'whatever'} to check in

//        yeah it's a bit much
//      */
//     const guid = "1234567"

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })

//     expect(webSocketServer).toBeDefined()

//     const wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {
//       wsClient.addEventListener('message', message => {
//         const msg = JSON.parse(message.data)
//         expect(msg.response).toEqual("success")
//         done()
//       })

//       wsClient.send(JSON.stringify({ guid: guid, eventId: 3 }))
//     })
//   })

//   test('closing socket: error -- socket has no cohortDeviceGUID property', async (done) => {

//     const eventId = 3
//     const guid = "1234567"

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })
//     expect(webSocketServer).toBeDefined()

//     const wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {
//       wsClient.addEventListener('message', message => {
//         const msg = JSON.parse(message.data)
//         expect(msg.response).toEqual("success")

//         let event = app.get("cohort").events.find( event => event.id == eventId)
//         expect(event).toBeDefined()

//         let device = event.devices.find( device => device.guid == guid)
//         expect(device).toBeDefined()  
//         expect(device.socket.cohortDeviceGUID).toEqual(guid)
        
//         delete device.socket.cohortDeviceGUID
//         expect(device.socket.cohortDeviceGUID).toBeUndefined()

//         wsClient.close()
//         setTimeout( () => {
//           expect(app.get('cohortSession').errors[0]).toEqual('Error: Could not find device for closed socket')
//           done()
//         }, 100)
//       })

//       wsClient.send(JSON.stringify({ guid: guid, eventId: 3 }))
//     })
//   })

//   test('closing socket (explicitly): happy path', async (done) => {

//     const eventId = 3
//     const guid = "1234567"

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })
//     expect(webSocketServer).toBeDefined()

//     const wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {
//       wsClient.addEventListener('message', message => {
//         const msg = JSON.parse(message.data)
//         expect(msg.response).toEqual("success")

//         wsClient.close()
//         setTimeout( () => {
//           expect(wsClient.readyState).toEqual(3)
          
//           let event = app.get("cohort").events.find( event => event.id == eventId)
//           expect(event).toBeDefined()

//           let device = event.devices.find( device => device.guid == guid)
//           expect(device).toBeDefined()  
//           expect(device.socket).toBeNull()

//           done()
//         }, 50)
//       })

//       wsClient.send(JSON.stringify({ guid: guid, eventId: 3 }))
//     })
//   })

//   // FYI this test takes a while to complete because it tests the keepalive function. Setting the keepalive interval on the server to a lower value is tempting but cellular connections don't like short intervals.
//   test('destroying socket: happy path', async (done) => { 

//     keepaliveIntervalDuration = 5000
//     jest.setTimeout(keepaliveIntervalDuration * 4)

//     const eventId = 3
//     const guid = "1234567"

//     const webSocketServer = await require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets', keepaliveIntervalDuration: keepaliveIntervalDuration
//     })
//     expect(webSocketServer).toBeDefined()

//     let wsClient = new ws(socketURL)

//     wsClient.addEventListener('open', event => {
//       wsClient.addEventListener('message', message => {
//         const msg = JSON.parse(message.data)
//         expect(msg.response).toEqual("success")
//         expect(webSocketServer.clients.size).toEqual(1)
//       })

//       wsClient.send(JSON.stringify({ guid: guid, eventId: eventId }))

//       setTimeout( () => {
//         console.log('simulating a nonresponsive client')
//         wsClient._receiver._events.ping = () => { 
//           console.log('client got ping but is pretending to be dead')
//         }

//         setTimeout( () => {
//           expect(webSocketServer.clients.size).toEqual(0)
//           done()
//         }, keepaliveIntervalDuration * 2.4)

//       }, keepaliveIntervalDuration * 1.2)
//     })
//   })

//   test('admin device gets broadcasts when device state changes', async (done) => {
//     const eventId = 3
//     const adminGUID = "54321" // this is seeded as an admin device
//     const device1GUID = "1234567"

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })
//     expect(webSocketServer).toBeDefined()

//     const adminClient = new ws(socketURL)
//     var device1Client

//     adminClient.addEventListener('open', event => {
//       let messagesReceived = 0
//       adminClient.addEventListener('message', message => {
//         const msg = JSON.parse(message.data)
//         messagesReceived++

//         if(messagesReceived == 1){        // handshake was successful
//           expect(msg.response).toEqual('success')

//           // connect the first device
//           device1Client = new ws(socketURL)
//           device1Client.addEventListener('open', event => {
//             device1Client.send(JSON.stringify({ guid: device1GUID, eventId: eventId}))
//           })

//         } else if(messagesReceived == 2){ // first device state broadcast
//           expect(msg.status).toHaveLength(3)
//           expect(msg.status
//             .find( deviceState => deviceState.guid == device1GUID)
//             .socketOpen
//           ).toEqual(false)

//         } else if(messagesReceived == 3){ // second device state broadcast 
//           expect(msg.status).toHaveLength(3)
//           expect(msg.status
//             .find( deviceState => deviceState.guid == device1GUID)
//             .socketOpen
//           ).toEqual(true)
//           device1Client.close()

//         } else if(messagesReceived == 4){ // last device state broadcast 
//           expect(msg.status).toHaveLength(3)
//           expect(msg.status
//             .find( deviceState => deviceState.guid == device1GUID)
//             .socketOpen
//           ).toEqual(false)
//           done()
//         } 
//       })

//       adminClient.send(JSON.stringify({ guid: adminGUID, eventId: eventId }))
//     })
//   })

//   // test that admin devices (2) get status for the correct event...

//   // test that event close shuts down active sockets nicely

//   test('broadcast: happy path', async (done) => {
//     const cohortMessage = {
//       targetTags: ["all"],
// 	    mediaDomain: "sound",
// 	    cueNumber: 1,
// 	    cueAction: "play"
//     }

//     const eventId = 3
//     const guid1 = "54321" 
//     const guid2 = "1234567"

//     const webSocketServer = require('./cohort-websockets')({
//       app: app, server: server, path: '/sockets'
//     })
//     expect(webSocketServer).toBeDefined()

//     const client1 = new ws(socketURL)

//     var broadcastsReceived = 0

//     client1.addEventListener('open', () => {
//       client1.send(JSON.stringify({ guid: guid1, eventId: eventId }))

//       client1.addEventListener('message', message => {
//         const msg = JSON.parse(message.data)
//         if(msg.mediaDomain !== undefined && msg.mediaDomain == 'sound'){
//           broadcastsReceived++
//         }
//       })

//       const client2 = new ws(socketURL)
      
//       client2.addEventListener('open', () => {
//         client2.send(JSON.stringify({ guid: guid2, eventId: eventId }))
        
//         client2.addEventListener('message', message => {
//           const msg = JSON.parse(message.data)
//           if(msg.mediaDomain !== undefined && msg.mediaDomain == 'sound'){
//             broadcastsReceived++
//           }
//         })

//         setTimeout( async () => {
//           setTimeout( () => {
//             expect(broadcastsReceived).toEqual(2)
//             done()
//           }, 500)
    
//           const res = await request(server)
//             .post('/api/v1/events/3/broadcast')
//             .send(cohortMessage)
    
//           expect(res.status).toEqual(200)
//           expect(res.text).toEqual("Successfully broadcast to 2 clients")
//         }, 500)

//       })
//     })
//   })
// })



// DEVICE ROUTES
// defunct

  // test('devices/:id/registerForNotifications : happy path', async () => {
  //   const guid = uuid()
  //   const interimResponse = await createDevice(guid)

  //   const payload = { token: 'abcde12345' }
  //   const deviceId = interimResponse.body.id
    
  //   const res = await request(app)
  //     .patch('/api/v1/devices/' + deviceId + '/register-for-notifications')
  //     .send(payload)
  //   expect(res.status).toEqual(200)
  //   expect(res.body.apnsDeviceToken).toEqual('abcde12345')
  // })
  
  // add test for id not found

  // test('devices/register-for-notifications : error: missing token', async () => {
  //   const payload = { 'blep': '012345678901234567890123456789012345'}
  //   const res = await request(app)
  //     .patch('/api/v1/devices/1/register-for-notifications')
  //     .send(payload)
  //   expect(res.status).toEqual(400)
  //   expect(res.text).toEqual("Error: Request must include a 'token' object")
  // })

  // MOVES TO EVENT OR OCCASION
  // test('devices/set-tags', async () => {
  //   const payload = { tags: [ 'blue', 'red' ]}
  //   const res = await request(app)
  //     .patch('/api/v1/devices/1/set-tags')
  //     .send(payload)
  //   expect(res.status).toEqual(200)
  //   expect(res.body.tags).toEqual(['blue', 'red'])

  //   const payload1 = { tags: [ 'purple' ]}
  //   const res1 = await request(app)
  //     .patch('/api/v1/devices/1/set-tags')
  //     .send(payload1)
  //   expect(res1.status).toEqual(200)
  //   expect(res1.body.tags).toEqual(['purple'])
  // })

  



// partially written tests, keeping them around for useful bits

//   test('websocket : multiple connections', async () => {
//     expect.assertions(3)

//     expect(app.get('cohortSession').devices).toHaveLength(0)
    
//     const webSocketServer = await require('./cohort-websockets')({ 
//       app: app, server: server
//     })

//     expect(webSocketServer).toBeDefined()

//     const guids = [ uuid(), uuid(), uuid(), uuid() ]

//     guids.map( guid => new CHDevice(guid) ).forEach( device => {
//       app.get('cohortSession').devices.push(device)
//     })
  
//     expect(app.get('cohortSession').devices).toHaveLength(4)

//     let clients = []
//     let connectionStatuses = []

//     guids.forEach( guid => {
//       const wsClient = new WebSocket('ws://localhost:3000')
//       let isOpen = new Promise( resolve => {
//         wsClient.addEventListener('open', event => {
//           wsClient.send(JSON.stringify({ guid: guid }))
//         })

//         // pick up here
//       })
//       clients.push(wsClient)
//       connectionStatuses.push(promise)
//     })
//   })


//     // const webSocketServer = require('./cohort-websockets')({
//     //   app: app, 
//     //   server: server,
//     //   callback: () => {
//     //     let clients = []
//     //     let connectionOpenPromises = []
//     //     for(i = 0; i < 4; i++){
//     //       const wsClient = new webSocket('ws://localhost:3000')
//     //       let promise = new Promise( (resolve) => {
//     //         wsClient.addEventListener('open', (event) => {
//     //           resolve()
//     //         })
//     //       })
//     //       clients.push(wsClient)
//     //       connectionOpenPromises.push(promise)
//     //     }
        
//     //     Promise.all(connectionOpenPromises).then(() => {
//     //       expect(app.get('cohortSession').devices).toHaveLength(4)
//     //       let connectedClients = clients.filter( (client) => {
//     //         return client.readyState == WebSocket.OPEN
//     //       })
//     //       expect(connectedClients).toHaveLength(4)
//     //       done()
//     //     })
//     //   }
//     // })


//   // test('websocket: keepalive for one minute', (done) => {
//   //   const webSocketServer = require('./cohort-websockets')({
//   //     app: app, 
//   //     server: server,
//   //     callback: () => {
//   //       const wsClient = new webSocket('ws://localhost:3000')
        
//   //       wsClient.addEventListener('open', (event) => {
//   //         expect(app.get('cohortSession').devices).toHaveLength(1)
//   //         setTimeout(() => {
//   //           expect(wsClient.readyState).toEqual(WebSocket.OPEN) // still open
//   //           done()
//   //         }, 60000)
//   //       })
//   //     }
//   //   })
//   // }, 70000)
// })
  
//   test('broadcast/push-notification : happy path (one device)', async () => {
//     // create a device
//     const guid = uuid()
//     const res1 = await createDevice(guid)
//     expect(res1.status).toEqual(200)

//     // register a device
//     const payload2 = { token: '12345', guid: guid }
//     const res2 = await request(app)
//       .post('/api/devices/register-for-notifications')
//       .send(payload2)
//     expect(res2.status).toEqual(200)

//     // test broadcast endpoint
//     const payload = { 
//       "text": "hello world",
//       "bundleId": "rocks.cohort.test",
//       "simulate": "success"
//     }

//     const res = await request(app)
//       .post('/api/broadcast/push-notification')
//       .send(payload)
//     expect(res.status).toEqual(200)
//     expect(res.text).toEqual("Sent notifications to 1/1 registered devices")
//   })
// })
