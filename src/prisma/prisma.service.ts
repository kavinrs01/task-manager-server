import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super()
  }

  async onModuleInit() {
    try {
      await this.$connect()
      console.log('Prisma connected successfully.')
    } catch (error) {
      console.error('Error connecting to Prisma:', error)
      process.exit(1)
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect()
      console.log('Prisma disconnected successfully.')
    } catch (error) {
      console.error('Error disconnecting from Prisma:', error)
    }
  }
}
