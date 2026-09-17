import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function buildMockHost(
  jsonSpy: jest.Mock,
  statusSpy: jest.Mock,
): ArgumentsHost {
  const response = { status: statusSpy, json: jsonSpy };
  statusSpy.mockReturnValue(response);
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  it('wraps an HttpException in the standard envelope', () => {
    const filter = new AllExceptionsFilter();
    const jsonSpy = jest.fn();
    const statusSpy = jest.fn();
    const host = buildMockHost(jsonSpy, statusSpy);
    const exception = new HttpException(
      'Recurso no encontrado',
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, host);

    expect(statusSpy).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonSpy).toHaveBeenCalledWith({
      status: 'error',
      message: 'Recurso no encontrado',
      data: null,
    });
  });

  it('wraps an unknown error as a 500 with a generic message', () => {
    const filter = new AllExceptionsFilter();
    const jsonSpy = jest.fn();
    const statusSpy = jest.fn();
    const host = buildMockHost(jsonSpy, statusSpy);

    filter.catch(new Error('unexpected failure'), host);

    expect(statusSpy).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonSpy).toHaveBeenCalledWith({
      status: 'error',
      message: 'Ocurrió un error inesperado.',
      data: null,
    });
  });
});
