import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { api, type Health } from '../lib/api';
import { VoiceButton } from '../components/VoiceButton';

type Message = { role: 'user' | 'assistant'; content: string };
export default function CommandCenter() {
  const [health, setHealth] = useState<Health | null>(null); const [input, setInput] = useState(''); const [messages, setMessages] = useState<Message[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { api.health().then(setHealth).catch(() => setHealth(null)); }, []);
  async function send(text = input) { const value = text.trim(); if (!value || busy) return; setInput(''); setBusy(true); setMessages(m => [...m, { role:'user', content:value }]); try { const result = await api.chat(value); const content = String((result as any).content || 'No response.'); setMessages(m => [...m, { role:'assistant', content }]); Speech.speak(content, { language:'pl-PL', rate:0.95 }); } catch (e) { setMessages(m => [...m, { role:'assistant', content:`Błąd połączenia: ${e instanceof Error ? e.message : 'unknown error'}` }]); } finally { setBusy(false); } }
  return <SafeAreaView style={styles.safe}><View style={styles.container}>
    <View style={styles.header}><View><Text style={styles.kicker}>COMMAND CENTER</Text><Text style={styles.title}>JARVIS 2.0</Text><Text style={styles.status}>{health ? 'SYSTEM ONLINE' : 'BACKEND OFFLINE'}</Text></View><Pressable onPress={() => router.push('/settings')}><Text style={styles.settings}>SETTINGS</Text></Pressable></View>
    <ScrollView style={styles.chat} contentContainerStyle={styles.chatContent}>{messages.length===0 && <Text style={styles.empty}>Gotowy. Wydaj polecenie.</Text>}{messages.map((m,i)=><View key={i} style={[styles.bubble,m.role==='user'?styles.user:styles.assistant]}><Text style={styles.role}>{m.role==='user'?'YOU':'JARVIS'}</Text><Text style={styles.message}>{m.content}</Text></View>)}</ScrollView>
    <View style={styles.composer}><TextInput value={input} onChangeText={setInput} placeholder="Wydaj polecenie…" placeholderTextColor="#697584" style={styles.input} multiline/><Pressable style={styles.send} onPress={() => send()}><Text style={styles.sendText}>{busy?'…':'SEND'}</Text></Pressable></View>
    <VoiceButton onText={text => send(text)} />
  </View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#05070a'},container:{flex:1,padding:20,gap:12},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},kicker:{color:'#7e8b9a',letterSpacing:3,fontSize:11},title:{color:'#f4f7fb',fontSize:36,fontWeight:'700'},status:{color:'#75d7a1',letterSpacing:1.5,fontSize:12,marginTop:4},settings:{color:'#8e9baa',fontSize:10,letterSpacing:1},chat:{flex:1,borderWidth:1,borderColor:'#26313d'},chatContent:{padding:12,gap:10,flexGrow:1,justifyContent:'flex-end'},empty:{color:'#697584',textAlign:'center',marginBottom:20},bubble:{padding:12,borderWidth:1,maxWidth:'92%'},user:{alignSelf:'flex-end',borderColor:'#465568'},assistant:{alignSelf:'flex-start',borderColor:'#26313d'},role:{color:'#7e8b9a',fontSize:10,letterSpacing:1.5,marginBottom:5},message:{color:'#e4e9ef',fontSize:15,lineHeight:21},composer:{flexDirection:'row',gap:8,alignItems:'flex-end'},input:{flex:1,minHeight:52,maxHeight:110,borderWidth:1,borderColor:'#354352',color:'#f4f7fb',padding:12},send:{minHeight:52,paddingHorizontal:16,justifyContent:'center',borderWidth:1,borderColor:'#59697a'},sendText:{color:'#f4f7fb',fontWeight:'700',letterSpacing:1}});
