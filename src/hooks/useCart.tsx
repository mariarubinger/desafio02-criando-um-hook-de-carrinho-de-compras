import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const copyCart = [...cart]; 
      //procura se o produto já existe no carrinho 
      const productAlreadyInCart = cart.find(
        product => product.id === productId
      );
      
      const productInStock: Stock = (await api.get(`/stock/${productId}`)).data;
      
     /*  if (productAlreadyInCart.amount) {
        const currentAmount = productAlreadyInCart.amount
      } else {
        const currentAmount = 0
      } */
      const currentAmount = productAlreadyInCart?.amount ?? 0;
      const amount = currentAmount + 1;
      
    
      if (amount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
        
        //se o produto ainda não existe no carrinho
      if (!productAlreadyInCart) {
          const newProduct: Product = (await api.get(`/products/${productId}`)).data;
          //adiciona o produto no carrinho
          copyCart.push({...newProduct, amount: 1 }); 
      } else {
        productAlreadyInCart.amount += 1;
      }

        setCart(copyCart)           
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(copyCart)) 
        toast('Adicionado!') 
    } catch {
        toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //verifica se o produto está no carrinho
      let productAlreadyInCart = cart.find(product => product.id === productId)

      if(productAlreadyInCart){
        //vai filtrar os itens do carrinho, devolvendo todos os itens que sejam diferentes
        const updatedCart = cart.filter(cartItem => cartItem.id !== productId);
          setCart(updatedCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)) 
          }else{
            toast.error('Erro na remoção do produto');
          }  
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    
    try {
      //se a quantidade do produto for menor ou igual a zero, sair da função instantaneamente
      if(amount < 1) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }
      //verificar se existe no estoque a quantidade desejada do produto
      const response = await api.get(`/stock/${productId}`)
      const productAmount = response.data.amount 
      const stockIsNotAvailable = amount > productAmount

     
      if (stockIsNotAvailable) {
      toast.error('Quantidade solicitada fora de estoque');
      return;
      }
    
      const updatedCart = cart.map(cartItem => cartItem.id === productId ? {
        ...cartItem,
        amount: amount
      } : cartItem)
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)) 
    
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
