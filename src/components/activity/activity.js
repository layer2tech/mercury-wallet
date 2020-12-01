import React from 'react';
import { useTable } from 'react-table'
import './activity.css';
import parse from 'html-react-parser'

function Activity() {
    const data = React.useMemo(
        () => [
            {
                col1:'October 12, 2020',
                col2: parse('  <span >11:30 AM Created 1 Statecoin</span>'),
                col3: '15kje…398hj',
                col4:  parse('Deposited  <span class="green">+0.005 BTC</span>'),
            },
            {
                col1: '',
                col2: '11:30 AM Created 1 Statecoin',
                col3: '',
                col4: '',
            },
            {
                col1: '',
                col2: '11:30 AM Swapped 1 Statecoin',
                col3: '15kje…398hj',
                col4: '',
            },
            {
                col1: '',
                col2: '11:30 AM Withdraw 1 Statecoin',
                col3: '15kje…398hj',
                col4: parse('Withdraw <span class="red">-0.005 BTC</span>'),
            }
        ],
        []
    )

    const columns = React.useMemo(
        () => [
            {
                Header: 'Date',
                accessor: 'col1', // accessor is the "key" in the data
            },
            {
                Header: 'Time',
                accessor: 'col2', // accessor is the "key" in the data
            },
            {
                Header: 'Coin',
                accessor: 'col3',
            },
            {
                Header: 'Type',
                accessor: 'col4',
            }
        ],
        []
    )

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow,
    } = useTable({ columns, data })

    return (
        <table {...getTableProps()} >
            <thead>
            {headerGroups.map(headerGroup => (
                <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map(column => (
                        <th
                            {...column.getHeaderProps()}

                        >
                            {column.render('Header')}
                        </th>
                    ))}
                </tr>
            ))}
            </thead>
            <tbody {...getTableBodyProps()}>
            {rows.map(row => {
                prepareRow(row)
                return (
                    <tr {...row.getRowProps()}>
                        {row.cells.map(cell => {
                            return (
                                <td
                                    {...cell.getCellProps()}

                                >
                                    {cell.render('Cell')}

                                </td>
                            )
                        })}
                    </tr>
                )
            })}
            </tbody>
        </table>
    )
}
export default Activity
