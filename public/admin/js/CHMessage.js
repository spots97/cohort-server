module.exports = function CHMessage(domain, cueNum, cueAct) {
  // let mediaDomains = {
  //   "sound": 0,
  //   "video": 1,
  //   "text": 2
  // }
  // mediaDomains.freeze

  // let cueActions = {
  //   "play": 0,
  //   "pause": 1,
  //   "restart": 2,
  //   "stop": 3
  // }
  // cueActions.freeze
  
  let msg = {
    targetTags: ["all"],
    mediaDomain: domain, //mediaDomains[domain],
    cueNumber: cueNum,
    cueAction: cueAct //cueActions[cueAct]
  }
  
  return msg
}