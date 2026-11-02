import { getResponse, postResponse, putResponse, deleteResponse } from './request'
import type {
  IntegrationConnector, IntegrationConnectorReq,
  IntegrationEvent, DispatchResult,
} from '@/types/integration'

export function loadConnectors() {
  return getResponse<{ items: IntegrationConnector[] }>('integration/connectors')
}

export function createConnector(data: IntegrationConnectorReq) {
  return postResponse<IntegrationConnector>('integration/connectors', data)
}

export function updateConnector(id: string, data: IntegrationConnectorReq) {
  return putResponse<IntegrationConnector>(`integration/connectors/${id}`, data)
}

export function deleteConnector(id: string) {
  return deleteResponse<any>(`integration/connectors/${id}`)
}

export function loadEvents(params?: { status?: string; topic?: string; limit?: number; offset?: number }) {
  return getResponse<{ items: IntegrationEvent[]; limit: number; offset: number }>('integration/events', params)
}

export function dispatchEvents() {
  return postResponse<DispatchResult>('integration/events/dispatch')
}
