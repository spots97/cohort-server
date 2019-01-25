const machina = require('machina')
const CHDevice = require('./CHDevice')

class CHEvent extends machina.Fsm {
  id
  label
  devices
  
  constructor(id, label){
    // constructor options for FSM
    super({
      namespace: 'cohort-event',
      initialState: 'uninitialized',
      states: {
        uninitialized: {
          openEvent: "open"
        },
        open: {
          _onEnter: function(){
            console.log('event ' + this.label + ' is now open')
          },
          closeEvent: "closed"
        },
        closed: {
          _onEnter: function(){
            console.log('event ' + this.label + ' is now closed')
          }, 
          openEvent: "open"
        }
      },

      // handlers
      open: function(){
        this.handle('openEvent')
      },

      close: function() {
        // once we're listening for device events, this should get refactored as a new state (openWithConnectedDevices)

        // we have to manually count websocket connections as they're closed
        let connectedDevices = this.devices.filter( device => device.socket != null )
        
        if(connectedDevices === undefined || 
           connectedDevices.length == 0){

          this.handle('closeEvent')

        } else {
          const expectedClosedSockets = connectedDevices.length
          let closedSockets = 0

          connectedDevices.forEach( device => {
            device.socket.on('close', socket => {
              closedSockets++
              if(closedSockets == expectedClosedSockets){
                this.handle('closeEvent')
              }
            })
            device.socket.close(1000, 'cohort event ' + this.label + ' is closing')
          })
        }
      }
    })

    // CHEvent-specific constructor
    this.id = id
    this.label = label
    this.devices = []
  }

  static fromDatabaseRow(dbEvent){
    let event = new CHEvent(dbEvent.id, dbEvent.label)
    
    if(dbEvent.devices != null &&
       dbEvent.devices !== undefined &&
       dbEvent.devices.length > 0){
      
        dbEvent.devices.map( dbDevice => {
          let cohortDevice = CHDevice.fromDatabaseRow(dbDevice)
          event.checkInDevice(cohortDevice)
        })
    } 
    
    return event
  }

  checkInDevice(device){
    // make sure the device is not already checked in on this event
    if(this.devices.find( existingDevice => {
      return existingDevice.guid === device.guid
    }) === undefined){
      this.devices.push(device)
      this.emit('deviceCheckedIn', device)
      this.broadcastDeviceStates() // eventually this should get triggered by a deviceStatesDidChange event bubbled up from CHDevice... I think?
    }  else {
      return new Error("Error: device guid:" + device.guid + " is already checked in to event " + this.label)
    }
  }

  broadcastDeviceStates(){
    let connectedAdminDevices = this.devices.filter( device => {
      return (device.isAdmin && device.socket != null && device.socket.readyState == 1)
    })

    if(connectedAdminDevices.length == 0) {
      return
    }

    const deviceStates = this.devices.map( device => {
      return device.deviceState()
    })

    connectedAdminDevices.forEach( adminDevice => {
      adminDevice.socket.send(JSON.stringify({ eventId: this.id, status: deviceStates }))
    })
  }
}

// CHEvent = function(id, label, devices = []){

//   let eventFSM = new machina.Fsm({
//     _id: id,
//     _label: label,
//     devices: devices, // do not add / remove objects to this array directly

//     initialize: function(options) {
//     },

//     namespace: 'cohort-event',

//     initialState: 'uninitialized',

//     states: {
//       uninitialized: {
//         openEvent: "open"
//       },
//       open: {
//         _onEnter: function(){
//           console.log('event ' + this._label + ' is now open')
//         },
//         closeEvent: "closed"
//       },
//       closed: {
//         _onEnter: function(){
//           let i = 0;
//           this.devices.forEach( device => {
//             if(device.socket != null && device.socket !== undefined){
//               device.socket.close(4002, "Event is closing")
//               i++
//             }
//           })
//           console.log('closed websocket connections to ' + i + ' clients')
//           console.log('event ' + this._label + ' is now closed')
//         },
//         // changeLabel: function(newLabel) {
//         //   console.log('changeLabel(' + newLabel + ')')
//         //   this.label = newLabel
//         // },
//         openEvent: "open"
//       }
//     },

//     // changeLabel: function(newLabel){
//     //   this.handle('changeLabel', newLabel)
//     // }
//     open: function(){
//       this.handle('openEvent')
//     },

//     close: function() {
//       this.handle('closeEvent')
//     },

//     checkInDevice: function(device){
//       // make sure the device is not already checked in on this event
//       if(this.devices.find( existingDevice => existingDevice._id === device._id) === undefined){
//         this.devices.push(device)
//         this.emit('deviceCheckedIn', device)
//         this.broadcastDeviceStates() // eventually this should get triggered by a deviceStatesDidChange event bubbled up from CHDevice... I think?
//       } 
//     },

//     broadcastDeviceStates: function(){

//       const connectedAdminDevices = this.devices.filter( device => {
//         return (device.isAdmin && device.socket != null && device.socket !== undefined && device.socket.readyState == 1)
//       })

//       const deviceStates = this.devices.map( device => {
//         let deviceState = { 
//           guid: device.guid
//         }
        
//         if(device.isConnected()){
//           deviceState.webSocketState = device.socket.readyState
//         } else {
//           deviceState.webSocketState = null
//         }
        
//         return deviceState
//       })

//       connectedAdminDevices.forEach( device => {
//         device.socket.send(JSON.stringify({ status: deviceStates }))
//       })
//     }
//   })

//   devices.forEach( device => {
//     eventFSM.checkInDevice(device)
//   })

//   return eventFSM
// }

module.exports = CHEvent