import { faker } from '@faker-js/faker'
import { createOrder } from '../createOrder'
import type { GetOrderByIdPathParams, GetOrderById200, GetOrderById400, GetOrderById404, GetOrderByIdQueryResponse } from '../../models/GetOrderById'

export function createGetOrderByIdPathParams(): NonNullable<GetOrderByIdPathParams> {
  return { orderId: faker.number.int() }
}

/**
 * @description successful operation
 */
export function createGetOrderById200(): NonNullable<GetOrderById200> {
  return createOrder()
}

/**
 * @description Invalid ID supplied
 */
export function createGetOrderById400(): NonNullable<GetOrderById400> {
  return undefined
}

/**
 * @description Order not found
 */
export function createGetOrderById404(): NonNullable<GetOrderById404> {
  return undefined
}

/**
 * @description successful operation
 */
export function createGetOrderByIdQueryResponse(): NonNullable<GetOrderByIdQueryResponse> {
  return createOrder()
}
