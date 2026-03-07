import 'reflect-metadata'
import { defineEventHandler } from 'h3'

;(globalThis as { defineEventHandler?: typeof defineEventHandler }).defineEventHandler = defineEventHandler
