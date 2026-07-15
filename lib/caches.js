import NodeCache from 'node-cache'

export const spamCache     = new NodeCache({ stdTTL: 60,  checkperiod: 30 })
export const warnCache     = new NodeCache({ stdTTL: 60,  checkperiod: 30 })
export const groupCache    = new NodeCache({ stdTTL: 600, checkperiod: 60 })
export const groupDbCache  = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false })
export const userDbCache   = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false })
export const xpCooldownCache = new NodeCache({ stdTTL: 60, checkperiod: 30 })
export const gachaCooldownCache = new NodeCache({ stdTTL: 45, checkperiod: 30 })
export const aiCooldownCache = new NodeCache({ stdTTL: 8, checkperiod: 10 })
export const aiSpontaneousCooldownCache = new NodeCache({ stdTTL: 120, checkperiod: 30 })
export const msgRetryCache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false })
