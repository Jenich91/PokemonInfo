import React, {useCallback, useEffect, useMemo, useState, useContext, createContext} from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import {createStore} from 'redux'
import {Provider, useDispatch, useSelector} from "react-redux"

const initialState = {
    pokemons: {}
}

function reducer(state = initialState, action) {
    switch (action.type) {
        case 'ADD':
            return {
                ...state,
                pokemons: {
                    ...state.pokemons,
                    [action.payload.id]: action.payload
                }
            }
        case 'REMOVE':
            const {[action.payload]: removed, ...remaining} = state.pokemons
            return {
                ...state,
                pokemons: remaining
            }
        case 'CLEAN':
            return initialState
        default:
            return state
    }
}

const store = createStore(reducer)

const PokemonComponent = React.memo((props) => {
    useEffect(() => {
        console.log("PokemonComponent rendered")
    }, [])

    return (
        <div className="pokemonInfo">
            <img src={props.imageUrl} alt={props.name + '_pic'} className="pokemon_img"/>
            <div className="pokemon_text">
                <h4>Name: {props.name}</h4>
                <h4>Forms amount: {props.formsAmount}</h4>
                <h4>Forms names: {props.formsNames}</h4>
            </div>
            <button onClick={props.onClose} className="close-button">✖</button>
        </div>
    )
})

const SearchComponent = React.memo((props) => {
    const [inputValue, setInputValue] = useState('')
    const pokemons = useSelector(state => state.pokemons)
    const dispatch = useDispatch()

    const handleChange = (event) => {
        setInputValue(event.target.value)
    }

    const handleClose = useCallback((id) => {
        dispatch({
            type: 'REMOVE',
            payload: id
        })
    }, [dispatch])

    const loadDefaultPokemon = useCallback(async () => {
        const fetchPokemonsInfo = async (pokemonUrls) => {
            return await Promise.all(pokemonUrls.map(url => addPokemonInfo(url)))
        }

        const addPokemonsToStore = (pokemons) => {
            pokemons.forEach(pokemon => {
                dispatch({
                    type: 'ADD',
                    payload: pokemon
                })
            })
        }

        const localData = localStorage.getItem('pokemonsList')
        if (localData && localData !== 'null') {
            // alert("Read pokemonList from localStorage happen")

            // Получаем информацию о покемонах из localStorage
            const parsedData = JSON.parse(localData)

            const defaultPokemons = await fetchPokemonsInfo(parsedData.results.map(pokemon => pokemon.url))
            addPokemonsToStore(defaultPokemons)

            return parsedData
        }

        // Получаем информацию о покемонах из API
        const response = await fetch(`${props.api_url}?limit=20`)
        if (!response.ok) throw new Error('Failed to load initial Pokemon')
        const newData = await response.json()

        localStorage.setItem('pokemonsList', JSON.stringify(newData))

        const defaultPokemons = await fetchPokemonsInfo(newData.results.map(pokemon => pokemon.url))
        addPokemonsToStore(defaultPokemons)
        return newData
    }, [props.api_url, dispatch])

    const addPokemonInfo = async (pokemon_url) => {
        try {
            const url_segments = new URL(pokemon_url).pathname.split('/')
            const id = url_segments.pop() || url_segments.pop()

            const storedPokemon = localStorage.getItem(`pokemon_${id}`)
            if (storedPokemon) {
                // alert("Read single pokemon from localStorage happen")

                return JSON.parse(storedPokemon)
            }

            const response = await fetch(pokemon_url)
            if (!response.ok) {
                throw new Error('Pokemon not found')
            }
            const responseJSON = await response.json()

            let evolution_chain_id = responseJSON.evolution_chain.url.split('/').slice(-2, -1)[0]
            let evolution_chainJSON = await (await fetch(`https://pokeapi.co/api/v2/evolution-chain/${evolution_chain_id}`)).json()
            const chain = evolution_chainJSON.chain

            let pokemonJSON = await (await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)).json()
            let name = pokemonJSON.name

            function getPokemonForms(chain) {
                const forms = []
                forms.push(chain.species.name)
                for (const evolution of chain.evolves_to) {
                    forms.push(...getPokemonForms(evolution))
                }
                return forms
            }

            const forms = getPokemonForms(chain)
            const formsAmount = forms.length
            const formsNames = forms.join(', ')
            let imageUrl = pokemonJSON.sprites.front_default

            const pokemonData = {
                id,
                name,
                formsAmount,
                formsNames,
                imageUrl
            }

            // Сохраняем покемона в localStorage
            localStorage.setItem(`pokemon_${id}`, JSON.stringify(pokemonData))

            return pokemonData
        } catch (err) {
            alert(err.message)
            return null
        }
    }

    const handleSubmit = useCallback(async (event) => {
        event.preventDefault()
        const onlyLettersRegex = /^[A-Za-z]+$/
        const emptyInput = inputValue === ""
        if (!emptyInput && !inputValue.match(onlyLettersRegex)) {
            alert("Invalid input")
            return
        }

        // много покемон
        if (emptyInput) {
            await loadDefaultPokemon()
            return
        }

        // один покемон
        const pokemonData = await addPokemonInfo(`${props.api_url}${inputValue}`)
        if (pokemonData) {
            dispatch({
                type: 'ADD',
                payload: pokemonData
            })
        }
    }, [inputValue, loadDefaultPokemon, addPokemonInfo, props.api_url, dispatch])


    const memoizedData = useMemo(() => {
        return Object.values(pokemons).map((item) => (
            <PokemonComponent key={item.id}
                              name={item.name}
                              formsAmount={item.formsAmount}
                              formsNames={item.formsNames}
                              imageUrl={item.imageUrl}
                              onClose={() => handleClose(item.id)}/>
        ))
    }, [pokemons, handleClose])


    const {isLight} = useContext(ThemeContext)
    useEffect(() => {
        document.body.style.setProperty('--background-color', isLight === true ? '#ffffff' : '#000000')
    }, [isLight])

    return (
        <div className={isLight === true ? 'light' : 'dark'}>
            <ThemeToggleComponent/>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="search-input"
                    placeholder={props.placeholderText}
                    value={inputValue}
                    onChange={handleChange}
                />
            </form>

            <div>
                {memoizedData}
            </div>
        </div>
    )
})

const ThemeContext = createContext({
    isLight: true,
    setIsLight: () => {
    }
})

const ThemeProvider = ({children}) => {
    const [isLight, setIsLight] = useState(true)

    return (
        <ThemeContext.Provider value={{isLight, setIsLight}}>
            {children}
        </ThemeContext.Provider>
    )
}

function cleanCash() {
    localStorage.clear()
    store.dispatch({
        type: 'CLEAN'
    })
}

const ThemeToggleComponent = React.memo(() => {
    const {isLight, setIsLight} = useContext(ThemeContext)

    const handleClick = () => {
        setIsLight(!isLight)
        // cleanCash()
    }

    return (
        <div>
            <input onClick={handleClick} type="checkbox" id="checkboxInput"/>
            <label htmlFor="checkboxInput" className="toggleSwitch">
                <span>{isLight ? 'Light' : 'Dark'}</span>
            </label>
        </div>
    )
})

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
    <ThemeProvider>
        <Provider store={store}>
            <SearchComponent
                api_url='https://pokeapi.co/api/v2/pokemon-species/'
                placeholderText='Enter pokemon name here'
            />
        </Provider>
    </ThemeProvider>
)
