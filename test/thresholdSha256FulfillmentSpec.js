'use strict'

const assert = require('chai').assert
const cc = require('..')
require('./helpers/hooks')

describe('ThresholdSha256', function () {
  const ex = {
    emptySha256: 'cf:0:',
    tinySha256: 'cf:0:AA',
    ed: 'cf:4:dqFZIESm5PURJlvKc6YE2QsFKdHfYCvjChmpJXZg0fWuxqtqkSKv8PfcuWZ_9hMTaJRzK254wm9bZzEB4mf-Litl-k1T2tR4oa2mTVD9Hf232Ukg3D4aVkpkexy6NWAB'
  }

  testFromFulfillments(
    {
      fulfillments: [
        ex.emptySha256
      ],
      threshold: 1
    },
    'cf:2:AQEBAQEBAwAAAAA',
    'cc:2:b:x07W1xU1_oBcV9zUheOzspx6Beq8vgy0vYgBVifNV1Q:10'
  )

  // Having the same subfulfillment appear twice is allowed, but note
  // how it results in a different condition URI, that is why this
  // behavior is safe.
  testFromFulfillments(
    {
      fulfillments: [
        ex.emptySha256,
        ex.emptySha256
      ],
      threshold: 2
    },
    'cf:2:AQIBAgEBAwAAAAABAQMAAAAA',
    'cc:2:b:y93kXzLJ49Qdn3CeCe6Qtuzmdg9LhPHQIESn8H4ghE0:14'
  )

  testFromFulfillments(
    {
      fulfillments: [
        ex.ed,
        ex.tinySha256
      ],
      threshold: 1
    },
    'cf:2:AQEBAgEBBAAAAQAAAQEAJwAEASAgdqFZIESm5PURJlvKc6YE2QsFKdHfYCvjChmpJXZg0fUBYA',
    'cc:2:2b:qD3rZtABzeF5vPqkXN_AJYRStKoowpnivH1-9fQFjSo:146'
  )

  // The order of subconditions is irrelevant for both conditions and fulfillments
  testFromFulfillments(
    {
      fulfillments: [
        ex.tinySha256,
        ex.ed
      ],
      threshold: 1
    },
    'cf:2:AQEBAgEBBAAAAQAAAQEAJwAEASAgdqFZIESm5PURJlvKc6YE2QsFKdHfYCvjChmpJXZg0fUBYA',
    'cc:2:2b:qD3rZtABzeF5vPqkXN_AJYRStKoowpnivH1-9fQFjSo:146'
  )

  testFromFulfillments(
    {
      fulfillments: [
        ex.ed,
        ex.tinySha256
      ],
      threshold: 2,
      message: new Buffer('abc', 'utf8')
    },
    'cf:2:AQIBAgEBBAAAAQAAAQFjAARgdqFZIESm5PURJlvKc6YE2QsFKdHfYCvjChmpJXZg0fWuxqtqkSKv8PfcuWZ_9hMTaJRzK254wm9bZzEB4mf-Litl-k1T2tR4oa2mTVD9Hf232Ukg3D4aVkpkexy6NWABAA',
    'cc:2:2b:qmhBlTdYm8mukRoIJla3EH9vNorXqXSWaKnlMHzz5D4:111'
  )

  function testFromFulfillments (params, fulfillmentUri, conditionUri) {
    describe('with ' + params.fulfillments.length + ' subfulfillments', function () {
      it('generates the correct fulfillment uri', function () {
        const f = new cc.ThresholdSha256()
        f.setThreshold(params.threshold)
        for (let sub of params.fulfillments) {
          f.addSubfulfillment(cc.fromFulfillmentUri(sub))
        }
        const uri = f.serializeUri()

        assert.equal(uri, fulfillmentUri)
      })

      it('generates the correct condition uri', function () {
        const f = new cc.ThresholdSha256()
        f.setThreshold(params.threshold)
        for (let sub of params.fulfillments) {
          f.addSubfulfillment(cc.fromFulfillmentUri(sub))
        }
        const uri = f.getConditionUri()

        assert.equal(uri, conditionUri)
      })

      it('validates the fulfillment', function () {
        const result = cc.validateFulfillment(fulfillmentUri, conditionUri, params.message)

        assert.equal(result, true)
      })
    })
  }

  describe('calculateWorstCaseLength', function () {
    const calc = cc.ThresholdSha256.calculateWorstCaseLength
      .bind(cc.ThresholdSha256)

    testWith(3, [1, 4], [2, 3], 3)
    testWith(200, [115, 300], [52, 9001], 9001)
    testWith(200, [115, 142, 300], [52, 18, 9001], 9001)
    testWith(400, [162, 210, 143, 195, 43], [768, 514, 350, 382, 57], 1632)
    testWith(100, [15, 31, 12, 33, 8], [139, 134, 314, 133, 464], -Infinity)

    function testWith (threshold, weights, costs, expectedResult) {
      it(`when given threshold=${threshold} weights=${weights} costs=${costs} returns ${expectedResult}`, function () {
        const subconditions = []
        for (let i = 0; i < weights.length; i++) {
          subconditions.push({
            weight: weights[i],
            size: costs[i]
          })
        }
        subconditions.sort((a, b) => b.weight - a.weight)

        const worstCase = calc(threshold, subconditions)

        assert.equal(worstCase, expectedResult)
      })
    }
  })
})
