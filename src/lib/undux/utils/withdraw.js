// @flow
import type { Store } from 'undux'
import goodWallet from '../../wallet/GoodWallet'
import pino from '../../logger/pino-logger'
import { ExceptionCategory } from '../../logger/exceptions'
import userStorage from '../../gundb/UserStorage'
import type { TransactionEvent } from '../../gundb/UserStorage'
import { WITHDRAW_STATUS_PENDING } from '../../wallet/GoodWalletClass'

const log = pino.child({ from: 'withdraw' })

type ReceiptType = {
  transactionHash: string,
  transactionIndex: number,
  blockHash: string,
  blockNumber: number,
  from: string,
  to: string,
  status: boolean,
}

/**
 * Execute withdraw from a transaction hash, and handle dialogs with process information using Undux
 *
 * @param {Store} store - Undux store
 * @param {string} code - code that unlocks the escrowed payment
 * @param {string} reason - the reason of payment
 * @param {string} category - the category of payment
 * @returns {Promise} Returns the receipt of the transaction
 */
export const executeWithdraw = async (
  store: Store,
  code: string,
  reason: string,
  category: string,
): Promise<ReceiptType | { status: boolean }> => {
  try {
    const { amount, sender, status, hashedCode } = await goodWallet.getWithdrawDetails(code)

    log.info('executeWithdraw', { code, reason, category, amount, sender, status, hashedCode })

    if (sender.toLowerCase() === goodWallet.account.toLowerCase()) {
      throw new Error("You can't withdraw your own payment link.")
    }

    if (status === WITHDRAW_STATUS_PENDING) {
      let txHash

      return new Promise((res, rej) => {
        goodWallet.withdraw(code, {
          onTransactionHash: transactionHash => {
            txHash = transactionHash

            const transactionEvent: TransactionEvent = {
              id: transactionHash,
              date: new Date().toString(),
              type: 'withdraw',
              data: {
                from: sender,
                amount,
                code,
                hashedCode,
                reason,
                category,
                otplStatus: 'completed',
              },
            }
            userStorage.enqueueTX(transactionEvent)
            res({ status, transactionHash })
          },
          onError: e => {
            userStorage.markWithErrorEvent(txHash)
            rej(e)
          },
        })
      })
    }

    return { status }
  } catch (e) {
    const { message } = e

    log.error('code withdraw failed', message, e, {
      code,
      category: message.endsWith('your own payment link.') ? ExceptionCategory.Human : ExceptionCategory.Blockhain,
    })

    throw e
  }
}
