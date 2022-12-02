import { fetcher } from '../../../../utils/fetcher';
import { 
  getPairAddressOperation as operation, 
  GetPairAddressRequest, 
  GetPairAddressResponse 
} from 'moralis/common-evm-utils';
import { FetchParams } from '../../../types';
import useSWR from 'swr';
import Moralis from 'moralis';

export const useEvmPairAddress = (request: GetPairAddressRequest, fetchParams?: FetchParams) => {
  const { deserializeResponse, serializeRequest } = operation
  const { data, error, mutate, isValidating } = useSWR<GetPairAddressResponse>(
    ['evmApi/getPairAddress', { deserializeResponse, request: serializeRequest(request, Moralis.Core) }], 
    fetcher, 
    {revalidateOnFocus: false, ...fetchParams}
  );

  return {
    data,
    error,
    refetch: async () => mutate(),
    isValidating,
  };
};