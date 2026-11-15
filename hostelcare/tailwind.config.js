import colors from 'tailwindcss/colors';

export default {
  content:['./index.html','./src/**/*.{js,jsx}'],
  theme:{extend:{
    colors:{
      navy:'#172554',
      teal:{...colors.teal,DEFAULT:'#0F766E'},
      amber:{...colors.amber,DEFAULT:'#F59E0B'}
    },
    fontFamily:{sans:['Plus Jakarta Sans','Inter','system-ui','sans-serif']}
  }},
  plugins:[]
};