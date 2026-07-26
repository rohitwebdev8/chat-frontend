import React from 'react';
import { ChatContainer } from './containers/ChatContainer';

interface Props {
  id: string;
}

export default function ChatScreen({ id }: Props) {
  return <ChatContainer roomId={id} />;
}
