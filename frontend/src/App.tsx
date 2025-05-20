import { ChakraProvider } from '@chakra-ui/react';
import Game from './components/Game';
import UI from './components/UI';

function App() {
  return (
    <ChakraProvider>
      <Game />
      <UI />
    </ChakraProvider>
  );
}

export default App; 