import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  @Get()
  root() {
    return {
      name: 'BillBox API',
      description:
        'A personal bill inbox and management engine. Consolidate, track, and manage all your bills in one place.',
      version: '1.0.0',
      status: 'operational',
      base: '/api/v1',
      endpoints: {
        auth: {
          register:        { method: 'POST',  path: '/api/v1/auth/register' },
          login:           { method: 'POST',  path: '/api/v1/auth/login' },
          me:              { method: 'GET',   path: '/api/v1/auth/me' },
        },
        bills: {
          create:          { method: 'POST',  path: '/api/v1/bills' },
          list:            { method: 'GET',   path: '/api/v1/bills' },
          get:             { method: 'GET',   path: '/api/v1/bills/:id' },
          edit:            { method: 'PATCH', path: '/api/v1/bills/:id' },
          timeline:        { method: 'GET',   path: '/api/v1/bills/:id/timeline' },
          pay:             { method: 'POST',  path: '/api/v1/bills/:id/pay' },
          updatePayment:   { method: 'PATCH', path: '/api/v1/bills/:id/payment' },
          updateNotes:     { method: 'PATCH', path: '/api/v1/bills/:id/notes' },
        },
        inbox: {
          send:            { method: 'POST',  path: '/api/v1/inbox/send' },
          list:            { method: 'GET',   path: '/api/v1/inbox' },
          get:             { method: 'GET',   path: '/api/v1/inbox/:id' },
          confirm:         { method: 'POST',  path: '/api/v1/inbox/:id/confirm' },
        },
        billers: {
          lookup:          { method: 'GET',   path: '/api/v1/billers/lookup?billBoxId=' },
          create:          { method: 'POST',  path: '/api/v1/billers' },
          list:            { method: 'GET',   path: '/api/v1/billers' },
          get:             { method: 'GET',   path: '/api/v1/billers/:id' },
          update:          { method: 'PATCH', path: '/api/v1/billers/:id' },
          delete:          { method: 'DELETE',path: '/api/v1/billers/:id' },
        },
        recurring: {
          create:          { method: 'POST',  path: '/api/v1/recurring' },
          list:            { method: 'GET',   path: '/api/v1/recurring' },
          get:             { method: 'GET',   path: '/api/v1/recurring/:id' },
          update:          { method: 'PATCH', path: '/api/v1/recurring/:id' },
          pause:           { method: 'POST',  path: '/api/v1/recurring/:id/pause' },
          resume:          { method: 'POST',  path: '/api/v1/recurring/:id/resume' },
          stop:            { method: 'POST',  path: '/api/v1/recurring/:id/stop' },
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
