import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { getApiUrl, setApiToken, setApiUrl } from '../lib/api';

export default function Settings() {
  const [url, setUrl] = useState(''); const [token, setToken] = useState(''); const [saved, setSaved] = useState(false);
  useEffect(() => { getApiUrl().then(setUrl); }, []);
  async function save() { await setApiUrl(url.trim()); await setApiToken(token.trim()); setSaved(true); }
  return <SafeAreaView style={styles.safe}><View style={styles.container}>
    <Text style={styles.kicker}>SYSTEM CONFIGURATION</Text><Text style={styles.title}>Connection</Text>
    <Text style={styles.label}>BACKEND URL</Text><TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} style={styles.input} placeholder="https://your-backend.example" placeholderTextColor="#697584" />
    <Text style={styles.label}>API TOKEN</Text><TextInput value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} secureTextEntry style={styles.input} placeholder="Token" placeholderTextColor="#697584" />
    <Pressable style={styles.button} onPress={save}><Text style={styles.buttonText}>{saved ? 'SAVED' : 'SAVE CONFIGURATION'}</Text></Pressable>
    <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>BACK TO COMMAND CENTER</Text></Pressable>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{flex:1,backgroundColor:'#05070a'}, container:{flex:1,padding:24,gap:12}, kicker:{color:'#7e8b9a',letterSpacing:2,fontSize:11}, title:{color:'#f4f7fb',fontSize:34,fontWeight:'700',marginBottom:18}, label:{color:'#8e9baa',fontSize:11,letterSpacing:1.2,marginTop:8}, input:{borderWidth:1,borderColor:'#354352',color:'#f4f7fb',padding:14,minHeight:52}, button:{borderWidth:1,borderColor:'#59697a',padding:16,alignItems:'center',marginTop:10}, buttonText:{color:'#f4f7fb',fontWeight:'700',letterSpacing:1}, back:{padding:14,alignItems:'center'}, backText:{color:'#8e9baa',letterSpacing:1} });
